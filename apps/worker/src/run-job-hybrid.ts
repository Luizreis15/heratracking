import { query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PHASE_ORDER } from "./constants.js";
import { WORKER_ROOT } from "./constants.js";
import type { Env } from "./env.js";
import { createJobState, ingestText } from "./output-ingest.js";
import {
  runPerplexityPhase,
  sectionKeyForPhase,
} from "./perplexity/run-phase.js";
import { buildContinuationPrompt } from "./prompt.js";
import {
  appendPhaseLog,
  claimOperation,
  initPhaseEvents,
  markOperationDone,
  markOperationError,
} from "./persist.js";
import { extractAssistantText, toolLogLine } from "./parser.js";
import type { MethodProfile, Operation } from "./types.js";

async function loadMethodProfile(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<MethodProfile | null> {
  const { data } = await supabase
    .from("method_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as MethodProfile | null;
}

const CLAUDE_PHASES = PHASE_ORDER.filter((p) => p !== "pesquisa");

export async function runJobHybrid(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id);
  if (!claimed) {
    console.log(`[worker] Operação ${queued.id} já claimada por outro processo`);
    return;
  }

  const operationId = claimed.id;
  console.log(`[worker][hybrid] BOM — ${operationId} — ${claimed.nicho}`);

  const state = createJobState();
  const sectionsSoFar: Record<string, unknown> = {};
  let totalCostUsd = 0;

  try {
    await initPhaseEvents(supabase, operationId);
    const profile = await loadMethodProfile(supabase, claimed.workspace_id);

    // Fase 1: Perplexity — melhor para busca web + concorrentes
    const { costUsd: pesquisaCost, data: pesquisaData } = await runPerplexityPhase(
      supabase,
      operationId,
      "pesquisa",
      claimed,
      profile,
      sectionsSoFar,
      env,
      state,
    );
    totalCostUsd += pesquisaCost;
    Object.assign(sectionsSoFar, sectionKeyForPhase("pesquisa", pesquisaData));

    await appendPhaseLog(
      supabase,
      operationId,
      "oferta",
      "🧠 Claude — fases 2 a 6 (skill arquiteto-de-agencia)...",
    );

    // Fases 2–6: Claude — melhor para síntese profunda e skill
    const prompt = buildContinuationPrompt(claimed, profile, sectionsSoFar);
    let claudeCostUsd: number | null = null;

    const q = query({
      prompt,
      options: {
        cwd: WORKER_ROOT,
        settingSources: ["project"],
        allowedTools: ["Skill", "WebSearch", "Read", "Glob", "Grep"],
        skills: ["arquiteto-de-agencia"],
        permissionMode: "acceptEdits",
        persistSession: false,
        systemPrompt: { type: "preset", preset: "claude_code" },
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY!,
          API_TIMEOUT_MS: "600000",
          CLAUDE_AGENT_SDK_CLIENT_APP: "hera-arquiteto-worker/0.1",
        },
        hooks: {
          PostToolUse: [
            {
              hooks: [
                async (input) => {
                  if (input.hook_event_name !== "PostToolUse") return { continue: true };
                  const line = toolLogLine(input.tool_name, input.tool_input);
                  await appendPhaseLog(supabase, operationId, state.currentPhase, line);
                  return { continue: true };
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                async (input) => {
                  if (input.hook_event_name !== "Stop") return { continue: true };
                  if (input.last_assistant_message) {
                    await ingestText(supabase, operationId, state, input.last_assistant_message);
                  }
                  return { continue: true };
                },
              ],
            },
          ],
        },
      },
    });

    for await (const message of q) {
      if (message.type === "assistant") {
        const text = extractAssistantText((message as SDKAssistantMessage).message.content);
        await ingestText(supabase, operationId, state, text);
      }

      if (message.type === "result" && message.subtype === "success") {
        claudeCostUsd = message.total_cost_usd;
        await ingestText(supabase, operationId, state, message.result);
      }

      if (message.type === "result" && message.subtype !== "success") {
        throw new Error(message.errors.join("; ") || `Agent SDK: ${message.subtype}`);
      }
    }

    totalCostUsd += claudeCostUsd ?? 0;

    const missing = CLAUDE_PHASES.filter((p) => !state.processedPhases.has(p));
    if (missing.length > 0) {
      throw new Error(`Protocolo incompleto — fases Claude ausentes: ${missing.join(", ")}`);
    }

    await markOperationDone(supabase, operationId, totalCostUsd);
    console.log(
      `[worker][hybrid] Operação ${operationId} concluída (custo ~$${totalCostUsd.toFixed(3)})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido no worker";
    console.error(`[worker][hybrid] Erro na operação ${operationId}:`, msg);
    await markOperationError(supabase, operationId, msg, state.currentPhase);
  }
}
