import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import { isSaasB2B } from "./operador-tipo.js";
import { buildOperadorB2BContext } from "./operador-context.js";
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
import { parseRefineBlock, parseSpinBlock, type SpinGuide } from "./parser.js";

const REFINE_MODEL = "claude-opus-4-8";

const SECTION_NAMES: Record<string, string> = {
  mercado_icp: "Mercado + ICP",
  oferta_escada: "Oferta / Escada de Valor",
  comercial: "Processo Comercial",
  posicionamento: "Posicionamento Digital",
  trafego_funil: "Tráfego + Funil",
  checklist: "Checklist de Implementação",
  hipoteses: "Hipóteses a Validar",
  spin: "SPIN Selling",
};

/** Esquema JSON esperado por seção — alinhado ao output-contract */
const SECTION_SCHEMA_HINT: Record<string, string> = {
  mercado_icp: `{ "resumo_mercado": [], "nivel_consciencia": 3, "icp": { "quem_e": "", "situacao_gatilho": "", "dores": [], "desejos": [], "objecoes": [], "onde_esta": [] }, "filtro_perfil": { "verde": [], "amarelo": [], "vermelho": [] } }`,
  oferta_escada: `{ "equacao_valor": "", "escada": [], "oferta_principal": { "promessa": "", "mecanismo_unico": "", "inclusos": [], "garantia": "", "bonus": [], "escassez": "" }, "precificacao": "" }`,
  comercial: `{ "funil_comercial": [], "sdr": { "criterios": [], "scripts": [] }, "closer": { "roteiro_call": [], "perguntas": [] }, "carta_vendas": "", "pitch_stacking": "" }`,
  posicionamento: `{ "statement": "", "narrativa": { "heroi": "", "problema": "", "guia": "", "plano": "", "cta": "" }, "pilares_conteudo": [], "linha_editorial": { "mix": "", "formatos": [], "cadencia": "", "bio_cta": "" } }`,
  trafego_funil: `{ "mapa_funil": [], "jornada_cliente": [], "campanhas": [], "angulos_criativos": [], "mensuracao": { "kpis": [], "tracking": "", "ritual": "" } }`,
  checklist: `{ "checklist": [] }`,
  hipoteses: `{ "hipoteses": [] }`,
};

const SPIN_SCHEMA_HINT = `{
  "situacao": ["4-6 perguntas específicas do nicho"],
  "problema": ["4-6 perguntas sobre dores do ICP"],
  "implicacao": ["4-6 perguntas que ampliam urgência"],
  "necessidade": ["4-6 perguntas que antecipam a solução"]
}`;

function buildRefinePrompt(
  sectionKey: string,
  sectionName: string,
  instruction: string,
  currentData: unknown,
  op: Operation,
  extras?: {
    spinGuide?: SpinGuide | null;
    comercialContext?: unknown;
  },
): { system: string; user: string } {
  const saas = isSaasB2B(op);
  const operadorCtx = buildOperadorB2BContext(op, null);

  const system = saas
    ? `Você é o Arquiteto GTM HERA. Refina seções do Blueprint Operacional de um SaaS B2B.

REGRAS OBRIGATÓRIAS:
1. Use EXATAMENTE o formato de blocos <<<HERA_REFINE:chave>>> ... <<<END>>> (e <<<HERA_SPIN>>> quando pedido).
2. Mantenha as MESMAS chaves JSON da seção — não remova chaves de primeiro nível.
3. Aplique a instrução do gestor com precisão.
4. Respeite compliance do briefing.
5. NÃO escreva texto fora dos blocos delimitados.`
    : `Você é o Arquiteto de Agência HERA. Refina seções do Blueprint Operacional.

REGRAS OBRIGATÓRIAS:
1. Use EXATAMENTE o formato de blocos <<<HERA_REFINE:chave>>> ... <<<END>>> (e <<<HERA_SPIN>>> quando pedido).
2. Mantenha as MESMAS chaves JSON da seção — não remova chaves de primeiro nível.
3. Aplique a instrução do gestor com precisão.
4. Respeite compliance do briefing.
5. NÃO escreva texto fora dos blocos delimitados.`;

  if (sectionKey === "spin") {
    const user = `${operadorCtx}

## Briefing
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Restrições: ${op.restricoes}

## Instrução do gestor
${instruction}

## SPIN Guide atual
${JSON.stringify(extras?.spinGuide ?? { situacao: [], problema: [], implicacao: [], necessidade: [] }, null, 2)}

## Contexto comercial (insumo)
${JSON.stringify(extras?.comercialContext ?? {}, null, 2)}

## Tarefa
Refine APENAS o guia SPIN Selling. Perguntas específicas do nicho — nunca genéricas.

Emita SOMENTE:
<<<HERA_SPIN>>>
${SPIN_SCHEMA_HINT}
<<<END>>>`;

    return { system, user };
  }

  const schemaHint = SECTION_SCHEMA_HINT[sectionKey] ?? "{}";
  const isComercial = sectionKey === "comercial";

  const spinBlock = isComercial
    ? `

## SPIN Selling Guide atual
${JSON.stringify(extras?.spinGuide ?? { situacao: [], problema: [], implicacao: [], necessidade: [] }, null, 2)}

Após o bloco da seção comercial, emita OBRIGATORIAMENTE o SPIN refinado:
<<<HERA_SPIN>>>
${SPIN_SCHEMA_HINT}
<<<END>>>`
    : "";

  const user = `${operadorCtx}

## Briefing
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket: ${op.ticket_alvo}
- Restrições: ${op.restricoes}

## Instrução do gestor
${instruction}

## Seção atual — ${sectionName}
${JSON.stringify(currentData, null, 2)}

## Esquema esperado (referência de chaves)
${schemaHint}${spinBlock}

Emita SOMENTE:
<<<HERA_REFINE:${sectionKey}>>>
{ JSON refinado completo da seção }
<<<END>>>${isComercial ? "\n<<<HERA_SPIN>>>\n{ JSON do SPIN }\n<<<END>>>" : ""}`;

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
      "blueprint",
      `🔧 Refinando "${sectionName}"...`,
    );

    const { data: bp } = await supabase
      .from("blueprints")
      .select("sections, spin_guide")
      .eq("operation_id", operationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentSections = (bp?.sections ?? {}) as Record<string, unknown>;
    const currentSpinGuide = (bp?.spin_guide ?? null) as SpinGuide | null;

    const { system, user } =
      section_key === "spin"
        ? buildRefinePrompt(section_key, sectionName, instruction, null, claimed, {
            spinGuide: currentSpinGuide,
            comercialContext: currentSections.comercial ?? {},
          })
        : buildRefinePrompt(
            section_key,
            sectionName,
            instruction,
            currentSections[section_key] ?? {},
            claimed,
            {
              spinGuide: currentSpinGuide,
            },
          );

    const { text, costUsd } = await callClaudeMessages(env.ANTHROPIC_API_KEY, {
      model: REFINE_MODEL,
      maxTokens: 8192,
      system,
      user,
      timeoutMs: 180_000,
    });

    console.log(`[worker][refine] resposta (${text.length} chars):`, text.slice(0, 500));

    if (section_key === "spin") {
      const refinedSpin = parseSpinBlock(text, false);
      if (!refinedSpin) {
        throw new Error("Bloco <<<HERA_SPIN>>> ausente ou JSON inválido na resposta");
      }
      await persistSpinGuide(supabase, operationId, refinedSpin);
    } else {
      const refined = parseRefineBlock(text, section_key);
      if (!refined) {
        console.error(`[worker][refine] parse falhou. Resposta:\n${text}`);
        throw new Error(
          `Bloco <<<HERA_REFINE:${section_key}>>> ausente ou JSON inválido na resposta`,
        );
      }
      await mergeBlueprintSections(supabase, operationId, { [section_key]: refined });

      if (section_key === "comercial") {
        const refinedSpin = parseSpinBlock(text, false);
        if (refinedSpin) {
          await persistSpinGuide(supabase, operationId, refinedSpin);
          console.log(`[worker][refine] SPIN guide atualizado — ${operationId}`);
        } else {
          console.warn(
            `[worker][refine] comercial refinado mas HERA_SPIN ausente — seção salva, SPIN mantido`,
          );
        }
      }
    }

    await appendPhaseLog(
      supabase,
      operationId,
      "blueprint",
      `✅ "${sectionName}" refinado com sucesso`,
    );

    if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
      restoreJobMode: true,
    });

    console.log(`[worker][refine] ${sectionName} concluído — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no refinamento";
    console.error(`[worker][refine] ${msg}`);
    await markOperationError(supabase, operationId, msg, null);
  }
}
