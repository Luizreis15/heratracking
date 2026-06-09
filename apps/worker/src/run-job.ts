import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import { runComparativo } from "./run-comparativo.js";
import { runConcorrenciaEnrichment } from "./run-concorrencia.js";
import { runIntelScan } from "./run-intel.js";
import { runJobSwarm } from "./run-job-swarm.js";
import { runJobContent } from "./run-job-content.js";
import { runJobRefine } from "./run-job-refine.js";
import type { Operation } from "./types.js";

/**
 * Roteamento de jobs:
 * - full:               Swarm paralelo — Perplexity (fase 1) + dois agentes Claude em paralelo (fases 2–5) + síntese (fase 6)
 * - concorrencia:       Perplexity (busca web + enrich)
 * - intel:              Meta Graph + Perplexity (coleta factual)
 * - comparativo:        Claude (síntese estratégica)
 * - refine_section:     Claude direto (refinamento de seção única do Blueprint)
 * - content_generation: Claude direto (geração de posts, Reels e emails)
 */
export async function runJob(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  switch (queued.job_mode) {
    case "concorrencia":
      return runConcorrenciaEnrichment(supabase, queued, env);
    case "intel":
      return runIntelScan(supabase, queued, env);
    case "comparativo":
      return runComparativo(supabase, queued, env);
    case "refine_section":
      return runJobRefine(supabase, queued, env);
    case "content_generation":
      return runJobContent(supabase, queued, env);
    case "full":
    default:
      return runJobSwarm(supabase, queued, env);
  }
}
