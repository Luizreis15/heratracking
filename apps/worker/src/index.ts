import "dotenv/config";
import { loadEnv } from "./env.js";
import { createServiceClient } from "./supabase.js";
import { maybeQueueStaleIntelScan } from "./intel-scheduler.js";
import { fetchNextQueued } from "./persist.js";
import { runJob } from "./run-job.js";

async function main() {
  console.log("[worker] HERA Arquiteto worker iniciado — F4");

  const env = loadEnv();
  if (!env) {
    console.log("[worker] Modo sem env — aguardando configuração.");
    return;
  }

  const supabase = createServiceClient(env);
  let processing = false;

  console.log(`[worker] Supabase: ${env.SUPABASE_URL}`);
  console.log("[worker] Motores híbridos:");
  console.log(`  BOM full     → Perplexity (${env.PERPLEXITY_MODEL}) pesquisa + Claude fases 2–6`);
  console.log("  Concorrência → Perplexity (web)");
  console.log("  Intel        → Meta Graph + Perplexity (web)");
  console.log("  Comparativo  → Claude (síntese estratégica)");
  console.log(`[worker] Poll a cada ${env.POLL_INTERVAL_MS}ms — aguardando jobs queued`);

  const tick = async () => {
    if (processing) return;
    processing = true;
    try {
      const next = await fetchNextQueued(supabase);
      if (next) {
        await runJob(supabase, next, env);
      } else if (env.INTEL_AUTO_SCAN_HOURS > 0) {
        await maybeQueueStaleIntelScan(supabase, env.INTEL_AUTO_SCAN_HOURS);
      }
    } catch (err) {
      console.error("[worker] Erro no poll loop:", err);
    } finally {
      processing = false;
    }
  };

  await tick();
  setInterval(() => void tick(), env.POLL_INTERVAL_MS);
}

main().catch((err: unknown) => {
  console.error("[worker] Erro fatal:", err);
  process.exit(1);
});
