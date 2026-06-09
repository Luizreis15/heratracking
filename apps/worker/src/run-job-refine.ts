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

  const spinRules = includesSpin
    ? `\n7. Como está refinando a seção "comercial", TAMBÉM refine o SPIN Selling Guide abaixo mantendo as chaves (situacao, problema, implicacao, necessidade) e emita o bloco <<<HERA_SPIN>>>...<<<END>>> APÓS o bloco HERA_REFINE.`
    : "";

  const system = `Você é o Arquiteto de Agência HERA, responsável por refinar seções do Blueprint Operacional Mestre.

REGRAS ABSOLUTAS:
1. Sua resposta DEVE começar com <<<HERA_REFINE:${sectionKey}>>> e terminar com <<<END>>>. Sem texto antes ou depois.
2. Mantenha EXATAMENTE as mesmas chaves JSON da seção original. Não adicione nem remova chaves sem instrução explícita.
3. Aplique a instrução do gestor — seja ela uma correção pontual ou um novo contexto de negócio.
4. Se o gestor fornecer contexto de negócio extenso, use-o para corrigir terminologia, ICP e proposta de valor da seção.
5. Respeite restrições de compliance do briefing.
6. NUNCA emita markdown, explicações ou código fora dos blocos delimitados.${spinRules}`;

  const spinSection = includesSpin
    ? `\n## SPIN Selling Guide atual (refine também conforme a instrução acima)
\`\`\`json
${JSON.stringify(spinGuide, null, 2)}
\`\`\`
`
    : "";

  const spinOutputExample = includesSpin
    ? `\n<<<HERA_SPIN>>>
{ JSON do SPIN Guide refinado com as chaves situacao, problema, implicacao, necessidade }
<<<END>>>`
    : "";

  const user = `## Contexto da operação
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket-alvo: ${op.ticket_alvo}
- Modelo de entrega: ${op.modelo_entrega}
- Restrições: ${op.restricoes}

## Instrução / contexto de negócio do gestor
${instruction}

## Seção a refinar: ${sectionName} (chave JSON: \`${sectionKey}\`)
\`\`\`json
${JSON.stringify(currentData, null, 2)}
\`\`\`
${spinSection}
Aplique a instrução acima à seção. Corrija terminologia, ICP, proposta de valor e qualquer inconsistência que a instrução aponte.

Sua resposta completa (SEM NADA MAIS):

<<<HERA_REFINE:${sectionKey}>>>
{ JSON refinado com as mesmas chaves }
<<<END>>>${spinOutputExample}`;

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
