export const runtime = "nodejs";

// Minimal, unauthenticated liveness probe — deliberately leaks no configuration.
export async function GET() {
  return Response.json({ ok: true });
}
