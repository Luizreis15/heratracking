import { query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WORKER_ROOT, type PhaseName } from "./constants.js";
import type { Env } from "./env.js";
import { createJobState, ingestText, type JobState } from "./output-ingest.js";
import { runPerplexityPhase, sectionKeyForPhase } from "./perplexity/run-phase.js";
import { buildGroupAPrompt, buildGroupBPrompt, buildBlueprintPrompt } from "./prompt-phase.js";
import {
  appendPhaseLog,
  claimOperation,
  resetPhaseEvents,
  loadMethodProfile,
  markOperationDone,
  markOperationError,
  persistPhaseData,
  setPhaseStatus,
} from "./persist.js";
import { extractAssistantText, toolLogLine } from "./parser.js";
import type { Operation } from "./types.js";

type AgentResult = {
  sections: Record<string, unknown>;
  costUsd: number;
};

/** Executa um agente Claude isolado (um grupo de fases) e retorna as seções produzidas. */
async function runPhaseAgent(
  supabase: SupabaseClient,
  operationId: string,
  agentLabel: string,
  phases: PhaseName[],
  prompt: string,
  env: Env,
): Promise<AgentResult> {
  const state: JobState = createJobState();
  let costUsd = 0;

  for (const phase of phases) {
    await setPhaseStatus(supabase, operationId, phase, "running");
  }

  await appendPhaseLog(supabase, operationId, phases[0], `🔀 Swarm/${agentLabel} iniciado`);

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
        CLAUDE_AGENT_SDK_CLIENT_APP: "hera-swarm/0.1",
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
                  await ingestText(supabase, operationId, state, input.last_assistant_message, {
                    persistFn: persistPhaseData,
                  });
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
      await ingestText(supabase, operationId, state, text, { persistFn: persistPhaseData });
    }

    if (message.type === "result" && message.subtype === "success") {
      costUsd = message.total_cost_usd ?? 0;
      await ingestText(supabase, operationId, state, message.result, { persistFn: persistPhaseData });
    }

    if (message.type === "result" && message.subtype !== "success") {
      throw new Error(message.errors.join("; ") || `Agente ${agentLabel}: ${message.subtype}`);
    }
  }

  const missing = phases.filter((p) => !state.processedPhases.has(p));
  if (missing.length > 0) {
    throw new Error(`Agente ${agentLabel}: fases ausentes — ${missing.join(", ")}`);
  }

  return { sections: state.sectionsProduced, costUsd };
}

export async function runJobSwarm(
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
  console.log(`[worker][swarm] BOM — ${operationId} — ${claimed.nicho}`);

  let totalCostUsd = 0;

  try {
    await resetPhaseEvents(supabase, operationId);
    const profile = await loadMethodProfile(supabase, claimed.workspace_id);

    // ── Fase 1: Perplexity (pesquisa) ─────────────────────────────────────
    const { costUsd: pesquisaCost, data: pesquisaData } = await runPerplexityPhase(
      supabase,
      operationId,
      "pesquisa",
      claimed,
      profile,
      {},
      env,
      createJobState(),
    );
    totalCostUsd += pesquisaCost;
    const pesquisaSections = sectionKeyForPhase("pesquisa", pesquisaData);

    console.log(`[worker][swarm] Pesquisa concluída — disparando Grupos A e B em paralelo`);

    // ── Fases 2–3 e 4–5 em paralelo ───────────────────────────────────────
    const [groupA, groupB] = await Promise.all([
      runPhaseAgent(
        supabase,
        operationId,
        "A:oferta+comercial",
        ["oferta", "comercial"],
        buildGroupAPrompt(claimed, profile, pesquisaSections),
        env,
      ),
      runPhaseAgent(
        supabase,
        operationId,
        "B:posicionamento+trafego",
        ["posicionamento", "trafego"],
        buildGroupBPrompt(claimed, profile, pesquisaSections),
        env,
      ),
    ]);

    totalCostUsd += groupA.costUsd + groupB.costUsd;

    const allSections = {
      ...pesquisaSections,
      ...groupA.sections,
      ...groupB.sections,
    };

    console.log(`[worker][swarm] Grupos A e B concluídos — iniciando Blueprint`);

    // ── Fase 6: Blueprint (síntese) ────────────────────────────────────────
    await setPhaseStatus(supabase, operationId, "blueprint", "running");
    const groupC = await runPhaseAgent(
      supabase,
      operationId,
      "C:blueprint",
      ["blueprint"],
      buildBlueprintPrompt(claimed, profile, allSections),
      env,
    );
    totalCostUsd += groupC.costUsd;

    await markOperationDone(supabase, operationId, totalCostUsd);
    console.log(
      `[worker][swarm] Operação ${operationId} concluída (custo ~$${totalCostUsd.toFixed(3)})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido no swarm worker";
    console.error(`[worker][swarm] Erro na operação ${operationId}:`, msg);
    await markOperationError(supabase, operationId, msg, "blueprint");
  }
}
