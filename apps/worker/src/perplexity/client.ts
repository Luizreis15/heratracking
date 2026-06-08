const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

/** Tarifas aproximadas sonar-pro (USD / token) — para estimativa de cost_usd */
const RATES: Record<string, { input: number; output: number }> = {
  "sonar": { input: 1 / 1_000_000, output: 1 / 1_000_000 },
  "sonar-pro": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type PerplexityResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

export type ChatResult = {
  content: string;
  costUsd: number;
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rate = RATES[model] ?? RATES["sonar-pro"];
  return promptTokens * rate.input + completionTokens * rate.output;
}

export async function perplexityChat(params: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs?: number;
}): Promise<ChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 600_000);

  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    const body = (await res.json()) as PerplexityResponse;

    if (!res.ok) {
      throw new Error(body.error?.message ?? `Perplexity HTTP ${res.status}`);
    }

    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Perplexity retornou resposta vazia");

    const promptTokens = body.usage?.prompt_tokens ?? 0;
    const completionTokens = body.usage?.completion_tokens ?? 0;

    return {
      content,
      costUsd: estimateCost(params.model, promptTokens, completionTokens),
    };
  } finally {
    clearTimeout(timer);
  }
}
