import type { SupabaseClient } from "@supabase/supabase-js";

/** Enfileira scan automático se passou staleHours desde o último scan. */
export async function maybeQueueStaleIntelScan(
  supabase: SupabaseClient,
  staleHours: number,
): Promise<void> {
  if (staleHours <= 0) return;

  const { data: active } = await supabase
    .from("operations")
    .select("id")
    .in("status", ["queued", "running"])
    .limit(1);

  if (active && active.length > 0) return;

  const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabase
    .from("operations")
    .select("id, last_intel_scan_at")
    .eq("status", "done")
    .eq("job_mode", "full")
    .or(`last_intel_scan_at.is.null,last_intel_scan_at.lt.${cutoff}`)
    .order("last_intel_scan_at", { ascending: true, nullsFirst: true })
    .limit(5);

  if (!candidates || candidates.length === 0) return;

  for (const op of candidates) {
    const { count } = await supabase
      .from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("operation_id", op.id);

    if (!count || count === 0) continue;

    await supabase
      .from("operations")
      .update({ job_mode: "intel", status: "queued", error: null, finished_at: null })
      .eq("id", op.id)
      .eq("status", "done");

    console.log(`[worker][intel] Auto-scan enfileirado — ${op.id}`);
    return;
  }
}
