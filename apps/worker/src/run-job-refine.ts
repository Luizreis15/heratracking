import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import type { Operation } from "./types.js";
import {
  appendPhaseLog,
  claimOperation,
  incrementOperationCost,
  markOperationDone,
  markOperationError,
  mergeBlueprintSections,
} from "./persist.js";
import { callClaudeMessages } from "./anthropic/client.js";
import { parseRefineBlock } from "./parser.js";

const REFINE_MODEL = "claude-opus-4-8";

const SECTION_NAMES: Record<string, string> = {
  mercado_icp: "Mercado + ICP",
  oferta_escada: "Oferta / Escada de Valor",
  comercial: "Processo Comercial",
  posicionamento: "Posicionamento Digital",
  trafego_funil: "Tráfego + Funil",
  checklist: "Checklist de Implementação",
  hipoteses: "Hipóteses a Validar",
};

function buildPrompt(
  sectionKey: string,
  sectionName: string,
  instruction: string,
  currentData: unknown,
  op: Operation,
): { system: string; user: string } {
  const system = `Você é o Arquiteto de Agência HERA, responsável por refinar seções do Blueprint Operacional Mestre conforme instruções do gestor.

Regras:
1. Mantenha EXATAMENTE as mesmas chaves JSON da seção original. Não adicione nem remova chaves sem instrução explícita.
2. Ajuste apenas os valores que a instrução pede.
3. Compliance odonto: copy para pacientes finais nunca promete cura ou resultado garantido.
4. Emita SOMENTE o bloco delimitado — sem texto adicional antes ou depois.`;

  const user = `## Contexto da operação
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket-alvo: ${op.ticket_alvo}
- Modelo de entrega: ${op.modelo_entrega}
- Restrições: ${op.restricoes}

## Instrução do gestor
${instruction}

## Seção atual: ${sectionName} (chave JSON: ${sectionKey})
\`\`\`json
${JSON.stringify(currentData, null, 2)}
\`\`\`

Refine a seção aplicando a instrução. Emita SOMENTE:

<<<HERA_REFINE:${sectionKey}>>>
{ JSON refinado }
<<<END>>>`;

  return { system, user };
}

export async function runJobRefine(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id, queued.job_mode);
  if (!claimed) {
    console.log(`[worker][refine] ${queued.id} já claimado`);
    return;
  }

  const operationId = claimed.id;
  const params = claimed.refine_params;

  if (!params?.section_key || !params?.instruction) {
    await markOperationError(supabase, operationId, "refine_params ausente ou inválido", null);
    return;
  }

  const { section_key, instruction } = params;
  const sectionName = SECTION_NAMES[section_key] ?? section_key;

  console.log(`[worker][refine] ${sectionName} — ${operationId}`);

  try {
    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      `🔧 Refinando seção "${sectionName}"...`,
    );

    // Carrega seção atual do blueprint
    const { data: bp } = await supabase
      .from("blueprints")
      .select("sections")
      .eq("operation_id", operationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentSections = (bp?.sections ?? {}) as Record<string, unknown>;
    const currentData = currentSections[section_key] ?? {};

    const { system, user } = buildPrompt(
      section_key,
      sectionName,
      instruction,
      currentData,
      claimed,
    );

    const { text, costUsd } = await callClaudeMessages(env.ANTHROPIC_API_KEY, {
      model: REFINE_MODEL,
      maxTokens: 8192,
      system,
      user,
      timeoutMs: 120_000,
    });

    const refined = parseRefineBlock(text, section_key);

    if (!refined) {
      throw new Error(
        `Bloco <<<HERA_REFINE:${section_key}>>> não encontrado ou JSON inválido na resposta`,
      );
    }

    await mergeBlueprintSections(supabase, operationId, { [section_key]: refined });

    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      `✅ Seção "${sectionName}" refinada com sucesso`,
    );

    if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
    });

    console.log(`[worker][refine] ${sectionName} concluído — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no refinamento";
    console.error(`[worker][refine] ${msg}`);
    await markOperationError(supabase, operationId, msg, null);
  }
}
