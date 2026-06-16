import { query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WORKER_ROOT } from "./constants.js";
import { buildComparativoPrompt } from "./comparativo-prompt.js";
import type { Env } from "./env.js";
import {
  appendPhaseLog,
  claimOperation,
  incrementOperationCost,
  loadMethodProfile,
  markOperationDone,
  markOperationError,
  persistComparisonReport,
  setPhaseStatus,
} from "./persist.js";
import { GEN_COPY } from "./generation-copy.js";
import { extractAssistantText, parseComparativoBlock } from "./parser.js";
import type { MethodProfile, Operation } from "./types.js";

function operadorFromOperation(
  operation: Operation,
  profile: MethodProfile | null,
): Record<string, unknown> {
  const opPerfil = operation.operador_perfil;
  if (opPerfil && typeof opPerfil === "object" && !Array.isArray(opPerfil)) {
    return opPerfil as Record<string, unknown>;
  }
  const ext = profile?.extensoes ?? {};
  const perfil = (ext as Record<string, unknown>).perfil;
  if (perfil && typeof perfil === "object") return perfil as Record<string, unknown>;
  return {
    nome: "Minha empresa",
    posicionamento: profile?.posicionamento ?? operation.posicionamento,
    ticket: operation.ticket_alvo,
  };
}

export async function runComparativo(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id, queued.job_mode);
  if (!claimed) return;

  const operationId = claimed.id;
  console.log(`[worker][claude] Comparativo estratégico — ${operationId}`);

  try {
    await setPhaseStatus(supabase, operationId, "pesquisa", "running");
    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      GEN_COPY.comparativoStart,
    );

    const profile = await loadMethodProfile(supabase, claimed.workspace_id);

    const { data: competitors } = await supabase
      .from("competitors")
      .select(
        "nome, url, instagram, posicionamento, oferta, ticket_estimado, pontos_fortes, pontos_fracos, angulos_criativos",
      )
      .eq("operation_id", operationId);

    if (!competitors || competitors.length === 0) {
      throw new Error("Mapeie concorrentes antes de gerar o comparativo estratégico.");
    }

    const { data: intelEvents } = await supabase
      .from("intel_events")
      .select("competitor_nome, event_type, titulo, resumo, url, fonte, detected_at")
      .eq("operation_id", operationId)
      .order("detected_at", { ascending: false })
      .limit(40);

    const prompt = buildComparativoPrompt({
      operation: claimed,
      profile,
      operador: operadorFromOperation(claimed, profile),
      competitors,
      intelEvents: intelEvents ?? [],
    });

    let totalCostUsd: number | null = null;
    let reportText = "";

    const q = query({
      prompt,
      options: {
        cwd: WORKER_ROOT,
        settingSources: ["project"],
        allowedTools: ["WebSearch"],
        permissionMode: "acceptEdits",
        persistSession: false,
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
        },
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY!,
          API_TIMEOUT_MS: "300000",
          CLAUDE_AGENT_SDK_CLIENT_APP: "hera-arquiteto-comparativo/0.1",
        },
      },
    });

    for await (const message of q) {
      if (message.type === "assistant") {
        reportText += extractAssistantText((message as SDKAssistantMessage).message.content);
      }
      if (message.type === "result" && message.subtype === "success") {
        totalCostUsd = message.total_cost_usd;
        reportText += message.result;
      }
      if (message.type === "result" && message.subtype !== "success") {
        throw new Error(message.errors.join("; ") || `Agent SDK: ${message.subtype}`);
      }
    }

    const content = parseComparativoBlock(reportText);
    if (!content) throw new Error("Bloco HERA_COMPARATIVO ausente ou JSON inválido");

    await persistComparisonReport(supabase, operationId, content, totalCostUsd, "claude-agent");

    if (totalCostUsd) await incrementOperationCost(supabase, operationId, totalCostUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
      restoreJobMode: true,
    });

    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      GEN_COPY.comparativoDone(competitors.length),
    );

    console.log(`[worker][claude] Comparativo concluído — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no comparativo estratégico";
    console.error(`[worker][claude] ${msg}`);
    await markOperationError(supabase, operationId, msg, "pesquisa");
  }
}
