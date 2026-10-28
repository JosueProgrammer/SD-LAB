"use server";

import { requireRole } from "@/lib/auth-service";
import { collectAdminLiveMetrics, type AdminLiveMetrics } from "@/lib/admin-metrics";

export type { AdminLiveMetrics };

export async function getAdminLiveMetrics(): Promise<AdminLiveMetrics> {
  await requireRole("ADMIN");
  return collectAdminLiveMetrics();
}
