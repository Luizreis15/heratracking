import type { SupabaseClient } from "@supabase/supabase-js";
import { PHASE_SECTION_KEY, type PhaseName } from "../constants.js";
import type { Env } from "../env.js";
import { createJobState, ingestText, type JobState } from "../output-ingest.js";
import {
  appendPhaseLog,
  setPhaseStatus,
} from "../persist.js";
import { buildPhaseMessages } from "./phase-prompts.js";
import { perplexityChat } from "./client.js";
import type { MethodProfile, Operation } from "../types.js";

export function sectionKeyForPhase(
  phase: PhaseName,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (phase === "blueprint") {
    const patch: Record<string, unknown> = {};
    if (Array.isArray(data.checklist)) patch.checklist = data.checklist;
    if (Array.isArray(data.hipoteses)) patch.hipoteses = data.hipoteses;
    return patch;
  }
  return { [PHASE_SECTION_KEY[phase]]: data };
}

export async function runPerplexityPhase(
  supabase: SupabaseClient,
  operationId: string,
  phase: PhaseName,
  operation: Operation,
  profile: MethodProfile | null,
  sectionsSoFar: Record<string, unknown>,
  env: Env,
  state: JobState,
): Promise<{ costUsd: number; data: Record<string, unknown> }> {
  await setPhaseStatus(supabase, operationId, phase, "running");
  await appendPhaseLog(
    supabase,
    operationId,
    phase,
    `🌐 Perplexity (${env.PERPLEXITY_MODEL}) — coleta web...`,
  );

  const { system, user } = await buildPhaseMessages(phase, operation, profile, sectionsSoFar);

  let costUsd = 0;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const retryHint =
      attempt > 1
        ? "\n\nATENÇÃO: sua resposta anterior não continha o bloco <<<HERA_PHASE>>> válido. Emita SOMENTE os blocos delimitados exigidos."
        : "";

    const result = await perplexityChat({
      apiKey: env.PERPLEXITY_API_KEY!,
      model: env.PERPLEXITY_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user + retryHint },
      ],
    });

    costUsd += result.costUsd;
    await ingestText(supabase, operationId, state, result.content);

    if (state.processedPhases.has(phase)) {
      if (phase === "pesquisa" && !state.competitorsProcessed) {
        lastError = "Bloco HERA_COMPETITORS ausente na fase pesquisa";
        continue;
      }

      const match = result.content.match(
        new RegExp(`<<<HERA_PHASE:${phase}>>>\\s*([\\s\\S]*?)\\s*<<<END>>>`),
      );
      if (!match?.[1]) throw new Error(`JSON da fase ${phase} não encontrado na resposta`);

      const data = JSON.parse(match[1].trim()) as Record<string, unknown>;
      return { costUsd, data };
    }

    lastError = `Bloco HERA_PHASE:${phase} não encontrado (tentativa ${attempt})`;
  }

  throw new Error(lastError ?? `Falha na fase ${phase}`);
}

export { createJobState };
