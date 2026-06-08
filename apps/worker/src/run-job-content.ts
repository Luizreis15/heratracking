import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import type { Operation } from "./types.js";
import {
  appendPhaseLog,
  claimOperation,
  markOperationDone,
  markOperationError,
} from "./persist.js";
import { parseContentBlock } from "./parser.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CONTENT_MODEL = "claude-opus-4-8";
const RATES = { input: 15 / 1_000_000, output: 75 / 1_000_000 };

type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  error?: { message: string };
};

async function callClaude(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ text: string; costUsd: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CONTENT_MODEL,
        max_tokens: 16384,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });

    const body = (await res.json()) as AnthropicResponse;
    if (!res.ok) throw new Error(body.error?.message ?? `Anthropic HTTP ${res.status}`);

    const text = body.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");

    if (!text.trim()) throw new Error("Claude retornou resposta vazia");

    return {
      text,
      costUsd: body.usage.input_tokens * RATES.input + body.usage.output_tokens * RATES.output,
    };
  } finally {
    clearTimeout(timer);
  }
}

const FORMAT_SCHEMAS: Record<string, string> = {
  post_instagram: `{ "titulo": "hook em 1 linha", "corpo": "caption com 3-5 parágrafos curtos, emojis permitidos", "cta": "chamada para ação", "hashtags": ["#hashtag1", ...] }`,
  script_reels: `{ "hook": "fala dos primeiros 3 segundos — direto ao ponto", "desenvolvimento": "narração de 30-45 segundos", "cta": "chamada final", "duracao_seg": 45 }`,
  email_prospeccao: `{ "assunto": "assunto (máx 60 chars, sem clickbait)", "corpo": "200-300 palavras, personalizado para implante/reabilitação", "cta": "próximo passo claro" }`,
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

  const system = `Você é o Gerador de Conteúdo HERA — especializado em criar copies B2B para agências de marketing ultra-nichadas em implantodontia.

Contexto: o ICP da agência são **clínicas e dentistas especializados em implante e reabilitação oral** que contratam a agência para gestão de marketing digital. O conteúdo gerado é da agência para atrair esses clientes B2B — NÃO para pacientes finais.

Compliance: nunca prometa resultado clínico garantido. Foco em resultados de marketing (leads, visibilidade, captação de pacientes qualificados).`;

  const user = `## Operação
- Nicho: ${op.nicho}
- Posicionamento: ${op.posicionamento}
- Ticket-alvo: ${op.ticket_alvo}
- Modelo: ${op.modelo_entrega}
- Restrições: ${op.restricoes}

## Dores prioritárias do ICP (clínicas de implante)
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
  const claimed = await claimOperation(supabase, queued.id);
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
    const { text, costUsd } = await callClaude(env.ANTHROPIC_API_KEY, system, user);

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

    const prevCost = claimed.cost_usd ?? 0;
    await markOperationDone(supabase, operationId, prevCost + costUsd, {
      keepPhase: "blueprint",
    });

    console.log(`[worker][content] ${rows.length} itens gravados — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na geração de conteúdo";
    console.error(`[worker][content] ${msg}`);
    await markOperationError(supabase, operationId, msg, null);
  }
}
