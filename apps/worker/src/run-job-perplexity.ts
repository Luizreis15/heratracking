import type { SupabaseClient } from "@supabase/supabase-js";
import { PHASE_ORDER } from "./constants.js";
import type { Env } from "./env.js";
import {
  claimOperation,
  initPhaseEvents,
  loadMethodProfile,
  markOperationDone,
  markOperationError,
} from "./persist.js";
import {
  createJobState,
  runPerplexityPhase,
  sectionKeyForPhase,
} from "./perplexity/run-phase.js";
import type { Operation } from "./types.js";

/** BOM 100% Perplexity — fallback legado (não usado no roteamento padrão). */
export async function runJobPerplexity(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id, queued.job_mode);
  if (!claimed) {
    console.log(`[worker] Operação ${queued.id} já claimada por outro processo`);
    return;
  }

  const operationId = claimed.id;
  console.log(`[worker][perplexity] Processando ${operationId} — ${claimed.nicho}`);

  const state = createJobState();
  const sectionsSoFar: Record<string, unknown> = {};
  let totalCostUsd = 0;

  try {
    await initPhaseEvents(supabase, operationId);
    const profile = await loadMethodProfile(supabase, claimed.workspace_id);

    for (const phase of PHASE_ORDER) {
      state.currentPhase = phase;
      const { costUsd, data } = await runPerplexityPhase(
        supabase,
        operationId,
        phase,
        claimed,
        profile,
        sectionsSoFar,
        env,
        state,
      );
      totalCostUsd += costUsd;
      Object.assign(sectionsSoFar, sectionKeyForPhase(phase, data));
    }

    await markOperationDone(supabase, operationId, totalCostUsd);
    console.log(
      `[worker][perplexity] Operação ${operationId} concluída (custo ~$${totalCostUsd.toFixed(3)})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido no worker";
    console.error(`[worker][perplexity] Erro na operação ${operationId}:`, msg);
    await markOperationError(supabase, operationId, msg, state.currentPhase);
  }
}
