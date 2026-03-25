import type { Database } from "@/integrations/supabase/types";

export type KpiScorecardRow = Database["public"]["Tables"]["kpi_scorecards"]["Row"];

export function kpiScorecardPublicUrl(storagePath: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/kpi-scorecards/${encoded}`;
}

/** Client-side visibility check (mirrors RLS intent). */
export function canSeeScorecard(
  row: KpiScorecardRow,
  ctx: { userId: string; isAdmin: boolean; isManagerOrSalesManager: boolean }
): boolean {
  if (row.status === "removed") return false;
  if (ctx.isAdmin) return true;
  const vt = row.visible_to;
  const hasVisible = vt != null && vt.length > 0;
  if (!hasVisible) return false;
  if (vt!.includes(ctx.userId)) return true;
  if (ctx.isManagerOrSalesManager && row.assigned_reviewers?.includes(ctx.userId)) return true;
  return false;
}
