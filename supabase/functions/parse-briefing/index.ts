import Anthropic from "npm:@anthropic-ai/sdk@0.39";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  descricao: string;
  tipo: "saas_b2b" | "agencia";
}

interface ParsedBriefing {
  nicho: string;
  posicionamento: string;
  ticket_alvo: string;
  restricoes: string;
  modelo_entrega: string;
}

const SAAS_MODELOS = [
  "SaaS por assinatura + implantação/onboarding",
  "SaaS self-service + planos enterprise",
  "Freemium / trial + conversão para pago",
  "Por módulo / usage-based",
  "Licença anual + suporte dedicado",
];

const AGENCIA_MODELOS = [
  "Gestão de tráfego pago",
  "Assessoria completa de marketing",
  "Retainer mensal + setup inicial",
  "Gestão de tráfego + assessoria estratégica",
  "Consultoria estratégica pontual",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body: ParseRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { descricao, tipo } = body;
  if (!descricao?.trim() || !tipo) {
    return json({ error: "descricao and tipo are required" }, 400);
  }

  const tipoLabel =
    tipo === "saas_b2b" ? "SaaS / Plataforma B2B" : "Agência de Marketing B2B";
  const modelos =
    tipo === "saas_b2b"
      ? SAAS_MODELOS.map((m) => `"${m}"`).join(", ")
      : AGENCIA_MODELOS.map((m) => `"${m}"`).join(", ");

  const prompt = `Você é um consultor de go-to-market. O usuário está cadastrando um negócio do tipo "${tipoLabel}" numa plataforma de análise estratégica.

Descrição livre escrita pelo usuário:
---
${descricao.trim()}
---

Extraia e estruture as informações em JSON com EXATAMENTE estes campos:

- nicho: quem é o comprador/cliente ideal (ICP). Foque na pessoa ou empresa que PAGA, não no usuário final. Máx 200 chars.
- posicionamento: como o negócio se diferencia para esse ICP. Inclua o mecanismo central e diferenciais. Máx 800 chars.
- ticket_alvo: faixa de preço cobrada. Se não mencionada, estime baseado no contexto. Máx 100 chars. Ex.: "R$ 2.000–R$ 8.000/mês"
- restricoes: restrições legais, éticas ou regulatórias do setor. Inclua LGPD se relevante. Máx 500 chars.
- modelo_entrega: OBRIGATÓRIO escolher exatamente um desses valores: ${modelos}

Regras:
- Responda SOMENTE com JSON válido, sem markdown, sem blocos de código, sem explicação.
- Nunca invente informações que não estão na descrição.
- Se uma informação não estiver clara, use uma estimativa razoável e marque como hipótese.

JSON esperado: {"nicho":"...","posicionamento":"...","ticket_alvo":"...","restricoes":"...","modelo_entrega":"..."}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";

    let parsed: ParsedBriefing;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      parsed = JSON.parse(match[0]);
    }

    return json(parsed, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse failed";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
