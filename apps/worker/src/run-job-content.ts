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
import { parseContentBlock } from "./parser.js";

const CONTENT_MODEL = "claude-opus-4-8";

const FORMAT_SCHEMAS: Record<string, string> = {
  post_instagram: `{ "titulo": "hook em 1 linha", "corpo": "caption com 3-5 parágrafos curtos, emojis permitidos", "cta": "chamada para ação", "hashtags": ["#hashtag1", ...] }`,
  script_reels: `{ "hook": "fala dos primeiros 3 segundos — direto ao ponto", "desenvolvimento": "narração de 30-45 segundos", "cta": "chamada final", "duracao_seg": 45 }`,
  email_prospeccao: `{ "assunto": "assunto (máx 60 chars, sem clickbait)", "corpo": "200-300 palavras, personalizado para o ICP B2B do briefing", "cta": "próximo passo claro" }`,
};

const FORMAT_LABELS: Record<string, string> = {
  post_instagram: "Post Instagram",
  script_reels: "Script Reels",
  email_prospeccao: "Email de Prospecção B2B",
};

function buildPrompt(op: Operation): { system: string; user: string } {
  const params = op.content_params!;
  const formatsBlock = params.formats
    .map((f) => `**${FORMAT_LABELS[f] ?? f}** → schema: ${FORMAT_SCHEMAS[f] ?? "{}"}`)
    .join("\n");

  const angulosBlock =
    params.angulos && params.angulos.length > 0
      ? params.angulos
          .slice(0, 3)
          .map(
            (a, i) =>
              `${i + 1}. Gancho: "${a.gancho ?? ""}" | Corpo: "${a.corpo ?? ""}" | CTA: "${a.cta ?? ""}"`,
          )
          .join("\n")
      : "Nenhum ângulo fornecido — use criatividade baseada nas dores.";

  const saas = isSaasB2B(op);
  const system = saas
    ? `Você é o Gerador de Conteúdo HERA — cria materiais de go-to-market B2B para SaaS/plataformas.

O conteúdo é da **plataforma (operador)** para atrair **empresas compradoras (ICP)** — decisores que contratam o software.

Respeite as restrições do briefing. Foco em pipeline B2B, autoridade, prova social enterprise, demos e conversão de trials.`
    : `Você é o Gerador de Conteúdo HERA — cria copies B2B para agências de marketing ultra-nichadas.

O conteúdo é da **agência (operador)** para atrair seu **cliente B2B (ICP)** — não para o consumidor final do ICP.

Respeite as restrições do briefing. Foco em resultados de marketing (leads, pipeline, visibilidade, autoridade).`;

  const user = `## Operação
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket-alvo: ${op.ticket_alvo}
- Modelo: ${op.modelo_entrega}
- Restrições: ${op.restricoes}

## Dores prioritárias do ICP
${params.dores.map((d, i) => `${i + 1}. ${d}`).join("\n")}

## Ângulos criativos disponíveis
${angulosBlock}

## Formatos solicitados e seus schemas JSON
${formatsBlock}

## Tarefa
Para **cada dor × cada formato**, gere 1 conteúdo. Total: ${params.dores.length} × ${params.formats.length} = ${params.dores.length * params.formats.length} itens.

Emita SOMENTE:
<<<HERA_CONTENT>>>
[
  { "format": "post_instagram", "dor": "dor exata como recebida", "content": { ... } },
  { "format": "script_reels", "dor": "dor exata", "content": { ... } },
  ...
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

  if (!params?.dores?.length || !params?.formats?.length) {
    await markOperationError(supabase, operationId, "content_params ausente ou inválido", null);
    return;
  }

  const totalItems = params.dores.length * params.formats.length;
  console.log(`[worker][content] ${totalItems} itens — ${operationId}`);

  try {
    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      `✍️ Gerando ${totalItems} peças de conteúdo (${params.dores.length} dores × ${params.formats.length} formatos)...`,
    );

    const { system, user } = buildPrompt(claimed);
    const { text, costUsd } = await callClaudeMessages(env.ANTHROPIC_API_KEY, {
      model: CONTENT_MODEL,
      maxTokens: 16384,
      system,
      user,
      timeoutMs: 180_000,
    });

    const items = parseContentBlock(text);

    if (!items || items.length === 0) {
      throw new Error("Bloco <<<HERA_CONTENT>>> não encontrado ou lista vazia");
    }

    // Persiste cada item em content_items
    const rows = items.map((item) => ({
      operation_id: operationId,
      workspace_id: claimed.workspace_id,
      format: item.format,
      dor: item.dor ?? null,
      content: item.content,
    }));

    const { error: insertErr } = await supabase.from("content_items").insert(rows);
    if (insertErr) throw new Error(`Falha ao gravar content_items: ${insertErr.message}`);

    await appendPhaseLog(
      supabase,
      operationId,
      "pesquisa",
      `✅ ${rows.length} peças gravadas com sucesso`,
    );

    if (costUsd) await incrementOperationCost(supabase, operationId, costUsd);
    await markOperationDone(supabase, operationId, undefined, {
      keepPhase: "blueprint",
      restoreJobMode: true,
    });

    console.log(`[worker][content] ${rows.length} itens gravados — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na geração de conteúdo";
    console.error(`[worker][content] ${msg}`);
    await markOperationError(supabase, operationId, msg, null);
  }
}
