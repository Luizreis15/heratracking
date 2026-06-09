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
  persistSpinGuide,
} from "./persist.js";
import { callClaudeMessages } from "./anthropic/client.js";
import { parseRefineBlock, parseSpinBlock } from "./parser.js";

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
  spinGuide?: unknown,
): { system: string; user: string } {
  const includesSpin = sectionKey === "comercial" && spinGuide != null;

  const system = `Você é o Arquiteto de Agência HERA, especialista em estruturar operações de agências.
Sua tarefa: refinar a seção JSON abaixo conforme a instrução do gestor.

REGRAS:
1. Mantenha EXATAMENTE as mesmas chaves JSON. Não adicione nem remova chaves.
2. Aplique a instrução — seja uma correção pontual ou novo contexto de negócio.
3. Respeite as restrições de compliance do briefing.
4. RESPONDA APENAS COM O JSON REFINADO. Zero texto antes ou depois. Zero markdown.`;

  const spinBlock = includesSpin
    ? `\n\n## SPIN Selling Guide atual (também ajuste se a instrução impactar o processo de vendas)
${JSON.stringify(spinGuide, null, 2)}

Após o JSON da seção, adicione o SPIN Guide refinado marcado assim:
<<<HERA_SPIN>>>
{ JSON do SPIN Guide }
<<<END>>>`
    : "";

  const user = `## Contexto
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket-alvo: ${op.ticket_alvo}
- Restrições: ${op.restricoes}

## Instrução do gestor
${instruction}

## Seção atual — ${sectionName}
${JSON.stringify(currentData, null, 2)}${spinBlock}

Retorne o JSON refinado da seção agora (APENAS o JSON, sem nenhum texto):`;

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

    // Carrega seção atual do blueprint (e spin_guide quando é seção comercial)
    const { data: bp } = await supabase
      .from("blueprints")
      .select("sections, spin_guide")
      .eq("operation_id", operationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentSections = (bp?.sections ?? {}) as Record<string, unknown>;
    const currentData = currentSections[section_key] ?? {};
    const currentSpinGuide = section_key === "comercial" ? (bp?.spin_guide ?? null) : null;

    const { system, user } = buildPrompt(
      section_key,
      sectionName,
      instruction,
      currentData,
      claimed,
      currentSpinGuide ?? undefined,
    );

    const { text, costUsd } = await callClaudeMessages(env.ANTHROPIC_API_KEY, {
      model: REFINE_MODEL,
      maxTokens: 8192,
      system,
      user,
      timeoutMs: 120_000,
    });

    console.log(`[worker][refine] resposta Claude (${text.length} chars):`, text.slice(0, 400));

    const refined = parseRefineBlock(text, section_key);

    if (!refined) {
      console.error(`[worker][refine] parseRefineBlock retornou null. Texto completo:\n${text}`);
      throw new Error(
        `Bloco <<<HERA_REFINE:${section_key}>>> não encontrado ou JSON inválido na resposta`,
      );
    }

    await mergeBlueprintSections(supabase, operationId, { [section_key]: refined });

    // Se refinando comercial, também atualiza o SPIN guide quando presente na resposta
    if (section_key === "comercial") {
      const refinedSpin = parseSpinBlock(text, false);
      if (refinedSpin) {
        await persistSpinGuide(supabase, operationId, refinedSpin);
        console.log(`[worker][refine] SPIN guide atualizado — ${operationId}`);
      }
    }

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
