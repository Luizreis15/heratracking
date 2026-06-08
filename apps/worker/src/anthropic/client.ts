const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const RATES_OPUS = { input: 15 / 1_000_000, output: 75 / 1_000_000 };

const MAX_RETRIES = 3;
const RETRYABLE = /rate.?limit|529|overloaded|timeout|timed out|ECONNRESET|abort|503|502/i;

type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  error?: { message: string; type?: string };
};

export type ClaudeCallOpts = {
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  timeoutMs: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOnce(
  apiKey: string,
  opts: ClaudeCallOpts,
): Promise<{ text: string; costUsd: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
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
      body.usage.input_tokens * RATES_OPUS.input +
      body.usage.output_tokens * RATES_OPUS.output;

    return { text, costUsd };
  } finally {
    clearTimeout(timer);
  }
}

/** Chamada direta à API Anthropic com retry em erros transitórios */
export async function callClaudeMessages(
  apiKey: string,
  opts: ClaudeCallOpts,
): Promise<{ text: string; costUsd: number }> {
  let lastErr: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callOnce(apiKey, opts);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const retryable = RETRYABLE.test(lastErr.message);
      if (attempt < MAX_RETRIES - 1 && retryable) {
        const delay = 1500 * (attempt + 1);
        console.warn(
          `[anthropic] Tentativa ${attempt + 1}/${MAX_RETRIES} falhou (${lastErr.message}) — retry em ${delay}ms`,
        );
        await sleep(delay);
        continue;
      }
      throw lastErr;
    }
  }

  throw lastErr ?? new Error("Claude falhou após retries");
}
