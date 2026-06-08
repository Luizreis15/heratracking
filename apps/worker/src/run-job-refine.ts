import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";
import type { Operation } from "./types.js";
import {
  appendPhaseLog,
  claimOperation,
  markOperationDone,
  markOperationError,
  mergeBlueprintSections,
} from "./persist.js";
import { parseRefineBlock } from "./parser.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const REFINE_MODEL = "claude-opus-4-8";

const RATES = { input: 15 / 1_000_000, output: 75 / 1_000_000 };

const SECTION_NAMES: Record<string, string> = {
  mercado_icp: "Mercado + ICP",
  oferta_escada: "Oferta / Escada de Valor",
  comercial: "Processo Comercial",
  posicionamento: "Posicionamento Digital",
  trafego_funil: "Tráfego + Funil",
  checklist: "Checklist de Implementação",
  hipoteses: "Hipóteses a Validar",
};

type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  error?: { message: string; type: string };
};

async function callClaude(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ text: string; costUsd: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: REFINE_MODEL,
        max_tokens: 8192,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });

    const body = (await res.json()) as AnthropicResponse;

    if (!res.ok) {
      throw new Error(body.error?.message ?? `Anthropic HTTP ${res.status}`);
    }

    const text = body.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");

    if (!text.trim()) throw new Error("Claude retornou resposta vazia");

    const costUsd =
      body.usage.input_tokens * RATES.input +
      body.usage.output_tokens * RATES.output;

    return { text, costUsd };
  } finally {
    clearTimeout(timer);
  }
}

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
  const claimed = await claimOperation(supabase, queued.id);
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

    const { text, costUsd } = await callClaude(env.ANTHROPIC_API_KEY, system, user);

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

    const prevCost = claimed.cost_usd ?? 0;
    await markOperationDone(supabase, operationId, prevCost + costUsd, {
      keepPhase: "blueprint",
    });

    console.log(`[worker][refine] ${sectionName} concluído — ${operationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no refinamento";
    console.error(`[worker][refine] ${msg}`);
    await markOperationError(supabase, operationId, msg, null);
  }
}
