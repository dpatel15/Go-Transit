import { getCurrentSession } from "@/lib/auth/session";
import { storage, generationStore } from "@/lib/server/services";
import { assertSafeKey } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serve a private asset. Access is doubly checked: the key must be prefixed
 * with the caller's org id, AND a generation with that id must belong to the
 * org. This keeps every tenant's images isolated behind authentication.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await getCurrentSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { key: parts } = await params;
  const key = parts.join("/");
  try {
    assertSafeKey(key);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const [orgId, generationId] = key.split("/");
  if (orgId !== session.org.id || !generationId) {
    return new Response("Forbidden", { status: 403 });
  }

  const generation = await generationStore.getForOrg(session.org.id, generationId);
  if (!generation) return new Response("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await storage.get(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const download = new URL(req.url).searchParams.has("download");
  const headers = new Headers({
    "content-type": "image/jpeg",
    "cache-control": "private, max-age=3600",
  });
  if (download) {
    headers.set("content-disposition", `attachment; filename="kankotri-${generationId}.jpg"`);
  }
  return new Response(new Uint8Array(data), { headers });
}
