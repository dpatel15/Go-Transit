import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { StudioClient } from "@/components/studio/studio-client";
import { requireSession } from "@/lib/auth/session";
import { generationStore, orgAccounting } from "@/lib/server/services";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const session = await requireSession();
  const [generations, credit] = await Promise.all([
    generationStore.listByOrg(session.org.id, 24),
    orgAccounting.getCreditState(session.org.id),
  ]);

  const remaining =
    Math.max(0, credit.includedThisMonth - credit.usedThisMonth) + (credit.purchasedRemaining ?? 0);

  const gallery = generations
    .filter((g) => g.status === "succeeded" && g.outputKey)
    .map((g) => ({
      id: g.id,
      url: `/api/assets/${g.outputKey}`,
      download: `/api/assets/${g.outputKey}?download=1`,
      region: g.regionId,
      mood: g.moodId,
      aspectRatio: g.aspectRatio,
    }));

  return (
    <>
      <SiteHeader />
      <main className="container-page py-10">
        <StudioClient
          orgName={session.org.name}
          remainingCredits={remaining}
          previewMode={env.IMAGE_PROVIDER === "mock"}
          initialGallery={gallery}
        />
      </main>
    </>
  );
}
