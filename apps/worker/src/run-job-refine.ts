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
import {
  FOCUS_FIELD_LABELS,
  FOCUS_FIELD_SCHEMA,
  isValidFocusField,
  mergeSectionPartial,
} from "./section-focus.js";

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

type RefinePromptOpts = {
  spinGuide?: SpinGuide | null;
  comercialContext?: unknown;
  /** Quando false, refine comercial não pede SPIN na mesma resposta */
  includeSpinOutput?: boolean;
  focusField?: string;
  /** Contexto completo da seção (para refine parcial por módulo) */
  sectionFull?: Record<string, unknown>;
};

function buildRefineSystem(op: Operation): string {
  const saas = isSaasB2B(op);
  return saas
    ? `Você é o Arquiteto GTM HERA. Refina seções do Blueprint Operacional de um SaaS B2B.

FORMATO OBRIGATÓRIO — copie exatamente os delimitadores:
<<<HERA_REFINE:chave>>>
{ JSON válido }
<<<END>>>

REGRAS:
1. JSON estrito (aspas duplas, sem vírgula final, sem comentários).
2. Mantenha as MESMAS chaves de primeiro nível da seção.
3. Zero texto fora dos delimitadores. Zero markdown. Zero \`\`\`json.`
    : `Você é o Arquiteto de Agência HERA. Refina seções do Blueprint Operacional.

FORMATO OBRIGATÓRIO — copie exatamente os delimitadores:
<<<HERA_REFINE:chave>>>
{ JSON válido }
<<<END>>>

REGRAS:
1. JSON estrito (aspas duplas, sem vírgula final, sem comentários).
2. Mantenha as MESMAS chaves de primeiro nível da seção.
3. Zero texto fora dos delimitadores. Zero markdown. Zero \`\`\`json.`;
}

function buildRefinePrompt(
  sectionKey: string,
  sectionName: string,
  instruction: string,
  currentData: unknown,
  op: Operation,
  extras?: RefinePromptOpts,
): { system: string; user: string } {
  const operadorCtx = buildOperadorB2BContext(op, null);
  const system = buildRefineSystem(op);

  if (sectionKey === "spin") {
    const spinSystem = `${system}

Para SPIN Selling use:
<<<HERA_SPIN>>>
{ JSON válido }
<<<END>>>`;

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

Emita SOMENTE este bloco (substitua o JSON pelo guia refinado):
<<<HERA_SPIN>>>
${SPIN_SCHEMA_HINT}
<<<END>>>`;

    return { system: spinSystem, user };
  }

  const focusField = extras?.focusField;
  const isPartial =
    !!focusField && isValidFocusField(sectionKey, focusField);

  const schemaHint = isPartial
    ? (FOCUS_FIELD_SCHEMA[focusField] ?? "{}")
    : (SECTION_SCHEMA_HINT[sectionKey] ?? "{}");

  const includeSpin =
    sectionKey === "comercial" && extras?.includeSpinOutput !== false && !isPartial;

  const focusLabel = focusField ? (FOCUS_FIELD_LABELS[focusField] ?? focusField) : sectionName;

  const user = isPartial
    ? `${operadorCtx}

## Briefing
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket: ${op.ticket_alvo}
- Restrições: ${op.restricoes}

## Instrução do gestor (módulo: ${focusLabel})
${instruction}

## Módulo atual — ${focusLabel}
${JSON.stringify(currentData, null, 2)}

## Contexto completo da seção (não altere outros módulos)
${JSON.stringify(extras?.sectionFull ?? {}, null, 2)}

## Esquema do módulo
${schemaHint}

IMPORTANTE: Refine APENAS o campo "${focusField}". Retorne JSON com somente essa chave.

Emita SOMENTE:
<<<HERA_REFINE:${sectionKey}>>>
${schemaHint}
<<<END>>>`
    : `${operadorCtx}

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
${schemaHint}

Emita SOMENTE este bloco (substitua o JSON pelo conteúdo refinado):
<<<HERA_REFINE:${sectionKey}>>>
${schemaHint}
<<<END>>>${includeSpin ? `\n\nDepois, em outro bloco separado:\n<<<HERA_SPIN>>>\n${SPIN_SCHEMA_HINT}\n<<<END>>>` : ""}`;

  return { system, user };
}

function buildRepairPrompt(sectionKey: string, failedText: string): string {
  const schemaHint =
    sectionKey === "spin" ? SPIN_SCHEMA_HINT : (SECTION_SCHEMA_HINT[sectionKey] ?? "{}");
  const marker =
    sectionKey === "spin" ? "<<<HERA_SPIN>>>" : `<<<HERA_REFINE:${sectionKey}>>>`;

  return `Sua resposta anterior não pôde ser parseada. Corrija e responda APENAS com UM bloco válido.

Resposta anterior (trecho):
${failedText.slice(0, 1200)}

Formato EXATO exigido:
${marker}
${schemaHint}
<<<END>>>

Sem texto antes ou depois. Sem markdown. JSON válido.`;
}

async function callRefineAndParse(
  apiKey: string,
  sectionKey: string,
  system: string,
  user: string,
): Promise<{ parsed: Record<string, unknown> | SpinGuide; text: string; costUsd: number }> {
  let totalCost = 0;

  const run = async (promptUser: string) => {
    const { text, costUsd } = await callClaudeMessages(apiKey, {
      model: REFINE_MODEL,
      maxTokens: 8192,
      system,
      user: promptUser,
      timeoutMs: 180_000,
    });
    totalCost += costUsd;
    return text;
  };

  let text = await run(user);
  console.log(`[worker][refine] resposta (${text.length} chars):`, text.slice(0, 500));

  if (sectionKey === "spin") {
    let spin = parseSpinBlock(text, false);
    if (!spin) {
      console.warn(`[worker][refine] retry SPIN após parse falhou`);
      text = await run(buildRepairPrompt("spin", text));
      spin = parseSpinBlock(text, false);
    }
    if (!spin) {
      console.error(`[worker][refine] parse SPIN falhou. Resposta:\n${text}`);
      throw new Error("Bloco <<<HERA_SPIN>>> ausente ou JSON inválido na resposta");
    }
    return { parsed: spin, text, costUsd: totalCost };
  }

  let refined = parseRefineBlock(text, sectionKey);
  if (!refined) {
    console.warn(`[worker][refine] retry ${sectionKey} após parse falhou`);
    text = await run(buildRepairPrompt(sectionKey, text));
    console.log(`[worker][refine] retry resposta (${text.length} chars):`, text.slice(0, 500));
    refined = parseRefineBlock(text, sectionKey);
  }

  if (!refined) {
    console.error(`[worker][refine] parse falhou. Resposta:\n${text}`);
    throw new Error(
      `Bloco <<<HERA_REFINE:${sectionKey}>>> ausente ou JSON inválido na resposta`,
    );
  }

  return { parsed: refined, text, costUsd: totalCost };
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

  const { section_key, instruction, focus_field: focusField } = params;
  const sectionName = SECTION_NAMES[section_key] ?? section_key;
  const focusLabel =
    focusField && FOCUS_FIELD_LABELS[focusField] ? FOCUS_FIELD_LABELS[focusField] : null;

  console.log(
    `[worker][refine] ${focusLabel ?? sectionName} — ${operationId}${focusField ? ` (focus: ${focusField})` : ""}`,
  );

  try {
    await appendPhaseLog(
      supabase,
      operationId,
      "blueprint",
      `🔧 Refinando "${focusLabel ?? sectionName}"...`,
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
    let totalCostUsd = 0;

    if (section_key === "spin") {
      const { system, user } = buildRefinePrompt(section_key, sectionName, instruction, null, claimed, {
        spinGuide: currentSpinGuide,
        comercialContext: currentSections.comercial ?? {},
      });
      const { parsed, costUsd } = await callRefineAndParse(
        env.ANTHROPIC_API_KEY,
        "spin",
        system,
        user,
      );
      totalCostUsd += costUsd;
      await persistSpinGuide(supabase, operationId, parsed as SpinGuide);
    } else {
      const currentSection = (currentSections[section_key] ?? {}) as Record<string, unknown>;
      const isPartial =
        !!focusField && isValidFocusField(section_key, focusField);

      const promptData = isPartial
        ? { [focusField]: currentSection[focusField] ?? null }
        : currentSection;

      const { system, user } = buildRefinePrompt(
        section_key,
        sectionName,
        instruction,
        promptData,
        claimed,
        {
          includeSpinOutput: section_key === "comercial" ? false : undefined,
          focusField: isPartial ? focusField : undefined,
          sectionFull: isPartial ? currentSection : undefined,
        },
      );
      const { parsed: refined, costUsd } = await callRefineAndParse(
        env.ANTHROPIC_API_KEY,
        section_key,
        system,
        user,
      );
      totalCostUsd += costUsd;

      const merged = isPartial
        ? mergeSectionPartial(currentSection, refined, focusField)
        : refined;
      await mergeBlueprintSections(supabase, operationId, { [section_key]: merged });

      if (section_key === "comercial" && !isPartial) {
        await appendPhaseLog(
          supabase,
          operationId,
          "blueprint",
          `🔧 Atualizando guia SPIN...`,
        );
        const spinPrompt = buildRefinePrompt("spin", "SPIN Selling", instruction, null, claimed, {
          spinGuide: currentSpinGuide,
          comercialContext: merged,
        });
        try {
          const { parsed: refinedSpin, costUsd: spinCost } = await callRefineAndParse(
            env.ANTHROPIC_API_KEY,
            "spin",
            spinPrompt.system,
            spinPrompt.user,
          );
          totalCostUsd += spinCost;
          await persistSpinGuide(supabase, operationId, refinedSpin as SpinGuide);
          console.log(`[worker][refine] SPIN guide atualizado — ${operationId}`);
        } catch (spinErr) {
          console.warn(
            `[worker][refine] comercial OK mas SPIN falhou: ${spinErr instanceof Error ? spinErr.message : spinErr}`,
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

    if (totalCostUsd) await incrementOperationCost(supabase, operationId, totalCostUsd);
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
