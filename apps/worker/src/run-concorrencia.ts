import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import {
  appendPhaseLog,
  claimOperation,
  incrementOperationCost,
  loadMethodProfile,
  markOperationDone,
  markOperationError,
  setPhaseStatus,
} from "./persist.js";
import { createJobState, ingestText } from "./output-ingest.js";
import { perplexityChat } from "./perplexity/client.js";
import { buildConcorrenciaEnrichMessages } from "./perplexity/phase-prompts.js";
import { formatSeedsForPrompt, parseSeeds } from "./concorrente-seeds.js";
import type { Operation } from "./types.js";

export async function runConcorrenciaEnrichment(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id, queued.job_mode);
  if (!claimed) return;

  const operationId = claimed.id;
  console.log(`[worker][perplexity] Enriquecendo concorrência — ${operationId}`);

  const state = createJobState();
  state.competitorsProcessed = false;

  try {
    await setPhaseStatus(supabase, operationId, "pesquisa", "running");
    const seeds = parseSeeds(claimed.concorrentes_seeds);
    const seedSummary = seeds.map((s) => s.nome).join(", ") || "—";
    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      `🔄 Enriquecendo concorrência — pesquisando: ${seedSummary}`,
    );
    if (seeds.length > 0) {
      console.log(`[worker] Seeds:\n${formatSeedsForPrompt(seeds)}`);
    }

    const profile = await loadMethodProfile(supabase, claimed.workspace_id);

    const { data: existing } = await supabase
      .from("competitors")
      .select("nome, url, oferta, posicionamento, ticket_estimado")
      .eq("operation_id", operationId);

    const { system, user } = await buildConcorrenciaEnrichMessages(
      claimed,
      profile,
      existing ?? [],
    );

    let costUsd = 0;
    let ok = false;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await perplexityChat({
        apiKey: env.PERPLEXITY_API_KEY!,
        model: env.PERPLEXITY_MODEL,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              user +
              (attempt > 1
                ? "\n\nATENÇÃO: inclua o bloco <<<HERA_COMPETITORS>>> com JSON array válido."
                : ""),
          },
        ],
      });

      costUsd += result.costUsd;
      state.competitorsProcessed = false;
      await ingestText(supabase, operationId, state, result.content, {
        competitorMode: "merge",
      });

      if (state.competitorsProcessed) {
        ok = true;
        break;
      }
    }

    if (!ok) throw new Error("Bloco HERA_COMPETITORS ausente na resposta");

    if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
      restoreJobMode: true,
    });
    console.log(`[worker][perplexity] Concorrência enriquecida — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao enriquecer concorrência";
    console.error(`[worker][perplexity] ${msg}`);
    await markOperationError(supabase, operationId, msg, "pesquisa");
  }
}
