"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { adminService } from "@/lib/server/services";
import { getPlan } from "@/lib/billing/plans";

export async function grantCreditsAction(formData: FormData): Promise<void> {
  await requireSuperAdmin(); // re-check gating on the action itself
  const orgId = String(formData.get("orgId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (orgId && Number.isFinite(amount) && amount > 0) {
    await adminService.grantCredits(orgId, amount);
  }
  revalidatePath("/admin");
}

export async function setPlanAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const orgId = String(formData.get("orgId") ?? "");
  const plan = getPlan(String(formData.get("planId") ?? ""));
  if (orgId && plan) {
    await adminService.setPlan(orgId, plan.id, plan.monthlyCredits);
  }
  revalidatePath("/admin");
}
