import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import type { Operation } from "./types.js";
import {
  appendPhaseLog,
  claimOperation,
  incrementOperationCost,
  markOperationDone,
  markOperationError,
} from "./persist.js";
import { callClaudeMessages } from "./anthropic/client.js";
import { isSaasB2B } from "./operador-tipo.js";
import { buildOperadorB2BContext } from "./operador-context.js";
import { parseContentBlock, type SpinGuide } from "./parser.js";
import {
  CONTENT_SYSTEM_PROMPT_AGENCIA,
  CONTENT_SYSTEM_PROMPT_SAAS,
} from "./content-directives.js";
import {
  buildBlueprintContentContext,
  formatBlueprintContextBlock,
} from "./content-context.js";

const CONTENT_MODEL = "claude-opus-4-8";

const VALID_FORMATS = new Set([
  "carrossel_instagram",
  "post_estatico",
  "reels",
  "email_prospeccao",
  "post_instagram",
  "script_reels",
]);

const FORMAT_SCHEMAS: Record<string, string> = {
  carrossel_instagram: `{
  "slides": ["headline slide 1", "slide 2", "..."],
  "legenda": "caption completa",
  "cta": "ação",
  "hashtags": ["#tag"],
  "gancho_contraintuitivo": "frase que quebra expectativa"
}`,
  post_estatico: `{
  "headline_imagem": "texto na arte",
  "legenda": "caption",
  "cta": "ação",
  "hashtags": ["#tag"],
  "gancho_contraintuitivo": "frase contraintuitiva"
}`,
  reels: `{
  "hook": "fala dos 3 primeiros segundos",
  "desenvolvimento": "roteiro 30-45s",
  "texto_tela": ["texto on-screen 1", "..."],
  "cta": "fechamento",
  "duracao_seg": 45,
  "gancho_contraintuitivo": "frase contraintuitiva"
}`,
  email_prospeccao: `{
  "assunto": "máx 60 chars",
  "corpo": "200-300 palavras B2B",
  "cta": "próximo passo",
  "gancho_contraintuitivo": "linha de abertura contraintuitiva"
}`,
};

const FUNIL_LABELS: Record<string, string> = {
  topo: "TOPO — awareness, parar o scroll, dor + gancho contraintuitivo",
  meio: "MEIO — consideração, mecanismo, prova, autoridade",
  fundo: "FUNDO — conversão, CTA direto, urgência real, demo/call",
};

function normalizeFormat(f: string): string {
  if (f === "post_instagram") return "post_estatico";
  if (f === "script_reels") return "reels";
  return f;
}

function buildGeneratePrompt(
  op: Operation,
  blueprintBlock: string,
  params: NonNullable<Operation["content_params"]> & {
    dores: string[];
    formats: string[];
  },
): { system: string; user: string } {
  const formats = params.formats.map(normalizeFormat);
  const funilEtapas = params.funil_etapas?.length
    ? params.funil_etapas
    : (["topo", "meio", "fundo"] as const);

  const formatsBlock = [...new Set(formats)]
    .map((f) => `**${f}** → ${FORMAT_SCHEMAS[f] ?? "{}"}`)
    .join("\n\n");

  const combos: string[] = [];
  for (const dor of params.dores) {
    for (const fmt of formats) {
      for (const funil of funilEtapas) {
        combos.push(`- dor: "${dor}" | formato: ${fmt} | funil_etapa: ${funil}`);
      }
    }
  }

  const system = isSaasB2B(op) ? CONTENT_SYSTEM_PROMPT_SAAS : CONTENT_SYSTEM_PROMPT_AGENCIA;
  const operadorCtx = buildOperadorB2BContext(op, null);

  const user = `${operadorCtx}

${blueprintBlock}

## Briefing
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket: ${op.ticket_alvo}
- Restrições: ${op.restricoes}

## Dores selecionadas para esta geração
${params.dores.map((d, i) => `${i + 1}. ${d}`).join("\n")}

## Etapas de funil nesta geração
${funilEtapas.map((f) => `- ${f}: ${FUNIL_LABELS[f] ?? f}`).join("\n")}

## Combinações obrigatórias (${combos.length} peças — 1 JSON por linha)
${combos.join("\n")}

## Schemas por formato
${formatsBlock}

## Tarefa
Gere EXATAMENTE ${combos.length} peças — uma para cada combinação acima.
Cada item DEVE incluir: format, dor (texto exato), funil_etapa, content (schema do formato).
O gancho_contraintuitivo vai DENTRO de content.

Emita SOMENTE:
<<<HERA_CONTENT>>>
[
  {
    "format": "carrossel_instagram",
    "dor": "dor exata",
    "funil_etapa": "topo",
    "content": { ... }
  }
]
<<<END>>>`;

  return { system, user };
}

function buildRefinePrompt(
  op: Operation,
  blueprintBlock: string,
  existing: { format: string; dor: string | null; content: Record<string, unknown> },
  instruction: string,
): { system: string; user: string } {
  const system = isSaasB2B(op) ? CONTENT_SYSTEM_PROMPT_SAAS : CONTENT_SYSTEM_PROMPT_AGENCIA;
  const fmt = normalizeFormat(existing.format);
  const schema = FORMAT_SCHEMAS[fmt] ?? "{}";

  const user = `${buildOperadorB2BContext(op, null)}

${blueprintBlock}

## Peça atual (${fmt})
Dor: ${existing.dor ?? "—"}
Funil: ${String(existing.content.funil_etapa ?? "—")}

\`\`\`json
${JSON.stringify(existing.content, null, 2)}
\`\`\`

## Instrução do gestor
${instruction}

## Tarefa
Refine APENAS esta peça. Mantenha format="${existing.format}" e a mesma dor.
Melhore gancho contraintuitivo, especificidade da dor e CTA de conversão.

Emita SOMENTE:
<<<HERA_CONTENT>>>
[
  {
    "format": "${existing.format}",
    "dor": "${existing.dor ?? ""}",
    "funil_etapa": "${String(existing.content.funil_etapa ?? "meio")}",
    "content": ${schema}
  }
]
<<<END>>>`;

  return { system, user };
}

export async function runJobContent(
  supabase: SupabaseClient,
  queued: Operation,
  env: Env,
): Promise<void> {
  const claimed = await claimOperation(supabase, queued.id, queued.job_mode);
  if (!claimed) {
    console.log(`[worker][content] ${queued.id} já claimado`);
    return;
  }

  const operationId = claimed.id;
  const params = claimed.content_params;

  if (!params) {
    await markOperationError(supabase, operationId, "content_params ausente", null);
    return;
  }

  const { data: bp } = await supabase
    .from("blueprints")
    .select("sections, spin_guide")
    .eq("operation_id", operationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sections = (bp?.sections ?? {}) as Record<string, unknown>;
  const spinGuide = (bp?.spin_guide ?? null) as SpinGuide | null;
  const blueprintCtx = buildBlueprintContentContext(sections, spinGuide);
  const blueprintBlock = formatBlueprintContextBlock(blueprintCtx);

  try {
    if (params.mode === "refine") {
      const itemId = params.refine_item_id;
      const instruction = params.instruction;
      if (!itemId || !instruction) {
        await markOperationError(supabase, operationId, "refine de conteúdo: params inválidos", null);
        return;
      }

      const { data: row, error: fetchErr } = await supabase
        .from("content_items")
        .select("id, format, dor, content")
        .eq("id", itemId)
        .eq("operation_id", operationId)
        .maybeSingle();

      if (fetchErr || !row) {
        await markOperationError(supabase, operationId, "peça de conteúdo não encontrada", null);
        return;
      }

      await appendPhaseLog(supabase, operationId, "blueprint", `🔧 Refinando peça de conteúdo...`);

      const { system, user } = buildRefinePrompt(
        claimed,
        blueprintBlock,
        {
          format: row.format,
          dor: row.dor,
          content: (row.content ?? {}) as Record<string, unknown>,
        },
        instruction,
      );

      const { text, costUsd } = await callClaudeMessages(env.ANTHROPIC_API_KEY, {
        model: CONTENT_MODEL,
        maxTokens: 8192,
        system,
        user,
        timeoutMs: 120_000,
      });

      const items = parseContentBlock(text);
      const refined = items?.[0];
      if (!refined) throw new Error("Refino de conteúdo: bloco HERA_CONTENT inválido");

      const mergedContent = {
        ...refined.content,
        funil_etapa: refined.content.funil_etapa ?? (row.content as Record<string, unknown>)?.funil_etapa,
      };

      const { error: updErr } = await supabase
        .from("content_items")
        .update({
          format: normalizeFormat(refined.format) === refined.format ? refined.format : row.format,
          content: mergedContent,
        })
        .eq("id", itemId);

      if (updErr) throw new Error(updErr.message);

      await appendPhaseLog(supabase, operationId, "blueprint", `✅ Peça de conteúdo refinada`);
      if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
      await markOperationDone(supabase, operationId, undefined, {
        keepPhase: "blueprint",
        restoreJobMode: true,
      });
      return;
    }

    // Generate mode
    if (!params.dores?.length || !params.formats?.length) {
      await markOperationError(supabase, operationId, "content_params ausente ou inválido", null);
      return;
    }

    const funilEtapas = params.funil_etapas?.length ? params.funil_etapas : ["topo", "meio", "fundo"];
    const totalItems = params.dores.length * params.formats.length * funilEtapas.length;

    console.log(`[worker][content] ${totalItems} peças — ${operationId}`);

    await appendPhaseLog(
      supabase,
      operationId,
      "blueprint",
      `✍️ Motor criativo: ${totalItems} peças (${params.dores.length} dores × ${params.formats.length} formatos × ${funilEtapas.length} funil)...`,
    );

    const { system, user } = buildGeneratePrompt(claimed, blueprintBlock, {
      ...params,
      dores: params.dores,
      formats: params.formats,
    });
    const { text, costUsd } = await callClaudeMessages(env.ANTHROPIC_API_KEY, {
      model: CONTENT_MODEL,
      maxTokens: 16384,
      system,
      user,
      timeoutMs: 240_000,
    });

    const items = parseContentBlock(text);
    if (!items?.length) {
      throw new Error("Bloco <<<HERA_CONTENT>>> não encontrado ou lista vazia");
    }

    const rows = items
      .filter((item) => VALID_FORMATS.has(item.format) || VALID_FORMATS.has(normalizeFormat(item.format)))
      .map((item) => {
        const fmt = normalizeFormat(item.format);
        const storeFormat =
          item.format === "post_instagram" || item.format === "script_reels"
            ? item.format
            : fmt;
        const funil =
          (item.content.funil_etapa as string) ??
          (item as { funil_etapa?: string }).funil_etapa ??
          "meio";
        return {
          operation_id: operationId,
          workspace_id: claimed.workspace_id,
          format: storeFormat === "post_estatico" && item.format === "post_instagram"
            ? "post_instagram"
            : storeFormat === "reels" && item.format === "script_reels"
              ? "script_reels"
              : fmt,
          dor: item.dor ?? null,
          content: { ...item.content, funil_etapa: funil },
        };
      });

    const { error: insertErr } = await supabase.from("content_items").insert(rows);
    if (insertErr) throw new Error(`Falha ao gravar content_items: ${insertErr.message}`);

    await appendPhaseLog(
      supabase,
      operationId,
      "blueprint",
      `✅ ${rows.length} peças criativas gravadas`,
    );

    if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
      restoreJobMode: true,
    });

    console.log(`[worker][content] ${rows.length} itens — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na geração de conteúdo";
    console.error(`[worker][content] ${msg}`);
    await markOperationError(supabase, operationId, msg, null);
  }
}
