import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhaseName } from "./constants.js";
import { parseCompetitorsBlock, parsePhaseBlocks } from "./parser.js";
import { persistCompetitors, persistPhase } from "./persist.js";

export type JobState = {
  currentPhase: PhaseName;
  processedPhases: Set<string>;
  competitorsProcessed: boolean;
  buffer: string;
};

export function createJobState(): JobState {
  return {
    currentPhase: "pesquisa",
    processedPhases: new Set(),
    competitorsProcessed: false,
    buffer: "",
  };
}

export async function ingestText(
  supabase: SupabaseClient,
  operationId: string,
  state: JobState,
  chunk: string,
  opts?: { competitorMode?: "insert" | "merge" },
): Promise<void> {
  if (!chunk) return;
  state.buffer += `\n${chunk}`;

  const phases = parsePhaseBlocks(state.buffer, state.processedPhases);
  for (const parsed of phases) {
    state.processedPhases.add(parsed.phase);
    state.currentPhase = parsed.phase;
    console.log(`[worker] Fase concluída: ${parsed.phase}`);
    await persistPhase(supabase, operationId, parsed);
  }

  const competitors = parseCompetitorsBlock(state.buffer, state.competitorsProcessed);
  if (competitors) {
    state.competitorsProcessed = true;
    console.log(`[worker] ${competitors.length} concorrentes capturados`);
    await persistCompetitors(
      supabase,
      operationId,
      competitors,
      opts?.competitorMode ?? "insert",
    );
  }
}
