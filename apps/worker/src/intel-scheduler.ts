import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Enfileira scan automático quando passou o intervalo configurado.
 * Cada operação pode ter seu próprio `intel_scan_hours` (UI config).
 * Operações com intel_scan_hours=0 caem no fallback do env INTEL_AUTO_SCAN_HOURS.
 */
export async function maybeQueueStaleIntelScan(
  supabase: SupabaseClient,
  globalStaleHours: number,
): Promise<void> {
  const { data: active } = await supabase
    .from("operations")
    .select("id")
    .in("status", ["queued", "running"])
    .limit(1);

  if (active && active.length > 0) return;

  const { data: candidates } = await supabase
    .from("operations")
    .select("id, last_intel_scan_at, intel_scan_hours")
    .eq("status", "done")
    .eq("job_mode", "full")
    .order("last_intel_scan_at", { ascending: true, nullsFirst: true })
    .limit(20);

  if (!candidates || candidates.length === 0) return;

  const now = Date.now();

  for (const op of candidates) {
    const hours =
      (op.intel_scan_hours as number) > 0
        ? (op.intel_scan_hours as number)
        : globalStaleHours;

    if (hours <= 0) continue;

    const lastScan = op.last_intel_scan_at
      ? new Date(op.last_intel_scan_at as string).getTime()
      : 0;

    if (lastScan > now - hours * 3_600_000) continue;

    const { count } = await supabase
      .from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("operation_id", op.id as string);

    if (!count || count === 0) continue;

    await supabase
      .from("operations")
      .update({ job_mode: "intel", status: "queued", error: null, finished_at: null })
      .eq("id", op.id as string)
      .eq("status", "done");

    console.log(`[worker][intel] Auto-scan enfileirado — ${op.id as string} (${hours}h)`);
    return;
  }
}
