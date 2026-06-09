import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhaseName } from "./constants.js";
import type { ParsedPhase } from "./parser.js";
import { parseCompetitorsBlock, parsePhaseBlocks, parseSpinBlock } from "./parser.js";
import { persistCompetitors, persistPhase, persistSpinGuide } from "./persist.js";

const PHASE_BLOCK_RE = /<<<HERA_PHASE:\w+>>>\s*[\s\S]*?\s*<<<END>>>/g;
const COMPETITORS_BLOCK_RE = /<<<HERA_COMPETITORS>>>\s*[\s\S]*?\s*<<<END>>>/g;
const SPIN_BLOCK_RE = /<<<HERA_SPIN>>>\s*[\s\S]*?\s*<<<END>>>/g;
const BUFFER_MAX = 24_000;

export type JobState = {
  currentPhase: PhaseName;
  processedPhases: Set<string>;
  /** Seções produzidas nesta sessão — usadas pelo swarm para coletar resultados de cada agente. */
  sectionsProduced: Record<string, unknown>;
  competitorsProcessed: boolean;
  spinProcessed: boolean;
  buffer: string;
};

export function createJobState(): JobState {
  return {
    currentPhase: "pesquisa",
    processedPhases: new Set(),
    sectionsProduced: {},
    competitorsProcessed: false,
    spinProcessed: false,
    buffer: "",
  };
}

/** Remove blocos já parseados e limita tamanho — evita buffer de MB em jobs longos */
function trimBuffer(buffer: string): string {
  let trimmed = buffer
    .replace(PHASE_BLOCK_RE, "")
    .replace(COMPETITORS_BLOCK_RE, "")
    .replace(SPIN_BLOCK_RE, "")
    .trim();
  if (trimmed.length > BUFFER_MAX) {
    trimmed = trimmed.slice(-BUFFER_MAX);
  }
  return trimmed;
}

export async function ingestText(
  supabase: SupabaseClient,
  operationId: string,
  state: JobState,
  chunk: string,
  opts?: {
    competitorMode?: "insert" | "merge";
    /** Função customizada de persistência — permite swarm usar persistPhaseData (sem side effects de status). */
    persistFn?: (supabase: SupabaseClient, operationId: string, parsed: ParsedPhase) => Promise<void>;
  },
): Promise<void> {
  if (!chunk) return;
  state.buffer += `\n${chunk}`;

  const persist = opts?.persistFn ?? persistPhase;
  const phases = parsePhaseBlocks(state.buffer, state.processedPhases);
  for (const parsed of phases) {
    state.processedPhases.add(parsed.phase);
    state.currentPhase = parsed.phase;
    state.sectionsProduced[parsed.phase] = parsed.data;
    console.log(`[worker] Fase concluída: ${parsed.phase}`);
    await persist(supabase, operationId, parsed);
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

  const spin = parseSpinBlock(state.buffer, state.spinProcessed);
  if (spin) {
    state.spinProcessed = true;
    await persistSpinGuide(supabase, operationId, spin);
  }

  state.buffer = trimBuffer(state.buffer);
}
