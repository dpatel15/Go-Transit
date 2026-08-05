import type { Organization, PrismaClient, User } from "@prisma/client";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/security/password";
import { generateSessionToken, hashToken } from "@/lib/security/tokens";

/** A pre-computed hash so login runs the same work whether or not the user exists. */
const DUMMY_HASH = hashPassword("kankotri-dummy-password-000");

export class AuthError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "EMAIL_TAKEN" | "INVALID_CREDENTIALS",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface SignupInput {
  email: string;
  password: string;
  orgName?: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  expiresAt: Date;
  user: User;
  org: Organization;
}

export interface SessionContext {
  user: User;
  org: Organization;
  sessionId: string;
}

export interface AuthServiceOptions {
  freeMonthlyCredits?: number;
  sessionTtlDays?: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "studio";
}

function defaultOrgName(email: string): string {
  const local = email.split("@")[0] ?? "My";
  return `${capitalize(local)}'s Studio`;
}

export function createAuthService(prisma: PrismaClient, options: AuthServiceOptions = {}) {
  const freeMonthlyCredits = options.freeMonthlyCredits ?? 30;
  const sessionTtlMs = (options.sessionTtlDays ?? 30) * 24 * 60 * 60 * 1000;

  async function uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    for (let i = 0; i < 6; i++) {
      const taken = await prisma.organization.findUnique({ where: { slug } });
      if (!taken) return slug;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + sessionTtlMs);
    await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
    return { token, expiresAt };
  }

  async function signup(input: SignupInput): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) {
      throw new AuthError("INVALID_INPUT", "Please enter a valid email address.");
    }
    const strength = validatePasswordStrength(input.password);
    if (!strength.ok) {
      throw new AuthError("INVALID_INPUT", strength.reason ?? "Weak password.");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AuthError("EMAIL_TAKEN", "An account with this email already exists.");
    }

    const orgName = input.orgName?.trim() || defaultOrgName(email);
    const slug = await uniqueSlug(orgName);
    const passwordHash = hashPassword(input.password);

    const { org, user } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug, includedMonthlyCredits: freeMonthlyCredits },
      });
      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email,
          passwordHash,
          name: input.name?.trim() || null,
          role: "owner",
        },
      });
      return { org, user };
    });

    const session = await createSession(user.id);
    return { token: session.token, expiresAt: session.expiresAt, user, org };
  }

  async function login(input: LoginInput): Promise<AuthResult> {
    // Bound work before hashing so an over-long password can't burn CPU.
    if (input.password.length > 200) {
      throw new AuthError("INVALID_CREDENTIALS", "Incorrect email or password.");
    }
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email }, include: { org: true } });
    // Always verify against *some* hash to avoid leaking which emails exist.
    const ok = verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new AuthError("INVALID_CREDENTIALS", "Incorrect email or password.");
    }
    const session = await createSession(user.id);
    const { org, ...rest } = user;
    return { token: session.token, expiresAt: session.expiresAt, user: rest as User, org };
  }

  async function logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  async function getSessionUser(token: string | undefined): Promise<SessionContext | null> {
    if (!token) return null;
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { org: true } } },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    const { org, ...user } = session.user;
    return { user: user as User, org, sessionId: session.id };
  }

  return { signup, login, logout, getSessionUser };
}

export type AuthService = ReturnType<typeof createAuthService>;
