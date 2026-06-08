import { query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WORKER_ROOT } from "./constants.js";
import type { Env } from "./env.js";
import { buildPrompt } from "./prompt.js";
import {
  appendPhaseLog,
  claimOperation,
  initPhaseEvents,
  markOperationDone,
  markOperationError,
  setPhaseStatus,
} from "./persist.js";
import { createJobState, ingestText } from "./output-ingest.js";
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

export async function runJobClaude(
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
  console.log(`[worker][claude] Processando ${operationId} — ${claimed.nicho}`);

  const state = createJobState();

  try {
    await initPhaseEvents(supabase, operationId);
    await setPhaseStatus(supabase, operationId, "pesquisa", "running");

    const profile = await loadMethodProfile(supabase, claimed.workspace_id);
    const prompt = buildPrompt(claimed, profile);

    let totalCostUsd: number | null = null;

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
                    await ingestText(
                      supabase,
                      operationId,
                      state,
                      input.last_assistant_message,
                    );
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
        totalCostUsd = message.total_cost_usd;
        await ingestText(supabase, operationId, state, message.result);
      }

      if (message.type === "result" && message.subtype !== "success") {
        throw new Error(message.errors.join("; ") || `Agent SDK: ${message.subtype}`);
      }
    }

    if (state.processedPhases.size < 6) {
      const missing = ["pesquisa", "oferta", "comercial", "posicionamento", "trafego", "blueprint"].filter(
        (p) => !state.processedPhases.has(p),
      );
      throw new Error(`Protocolo incompleto — fases ausentes: ${missing.join(", ")}`);
    }

    await markOperationDone(supabase, operationId, totalCostUsd);
    console.log(`[worker][claude] Operação ${operationId} concluída (custo: $${totalCostUsd?.toFixed(3) ?? "?"})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido no worker";
    console.error(`[worker][claude] Erro na operação ${operationId}:`, msg);
    await markOperationError(supabase, operationId, msg, state.currentPhase);
  }
}
