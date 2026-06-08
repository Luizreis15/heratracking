import type { MethodProfile, Operation } from "./types.js";
import { buildBriefingBlock, buildOperadorB2BContext } from "./operador-context.js";
import { isSaasB2B } from "./operador-tipo.js";

export type ComparativoInput = {
  operation: Operation;
  profile: MethodProfile | null;
  operador: Record<string, unknown>;
  competitors: Array<Record<string, unknown>>;
  intelEvents: Array<Record<string, unknown>>;
};

export function buildComparativoPrompt(input: ComparativoInput): string {
  const { operation, profile, operador, competitors, intelEvents } = input;
  const saas = isSaasB2B(operation);
  const operadorLabel =
    (typeof operador.nome === "string" && operador.nome.trim()) ||
    operation.posicionamento.split(/[—–-]/)[0]?.trim() ||
    "Operador";

  const roleLabel = saas ? "plataforma" : "agência";
  const competitorRule = saas
    ? "Compare **plataformas/soluções SaaS** (operador vs mercado). Nunca o ICP nem agências de marketing."
    : "Compare **agências/consultorias** (operador B2B). Nunca o ICP nem players do mercado do produto do ICP.";
  const audience = saas
    ? "tom direto para founders, CPO e líderes de GTM/vendas do SaaS"
    : "tom direto para sócios da agência";

  return `Você é o estrategista competitivo da ${roleLabel} **${operadorLabel}**.

## Contexto B2B
${buildOperadorB2BContext(operation, profile)}

${buildBriefingBlock(operation, profile)}

## Perfil do operador (nós)
${JSON.stringify(operador, null, 2)}

## Concorrentes mapeados (${competitors.length})
${JSON.stringify(competitors, null, 2)}

## Inteligência recente (${intelEvents.length} eventos)
${intelEvents.length > 0 ? JSON.stringify(intelEvents.slice(0, 30), null, 2) : "Nenhum evento recente."}

## Tarefa
Produza uma **análise comparativa estratégica** cruzando operador × todos os concorrentes.

Regras:
- ${competitorRule}
- Use dados fornecidos; complemente com WebSearch apenas para lacunas críticas (máx. 3 buscas).
- Marque inferências como hipótese. Não invente fatos.
- Respeite as restrições de compliance do briefing.
- ${audience}.

Emita APENAS um bloco:
<<<HERA_COMPARATIVO>>>
{
  "resumo_executivo": "2-4 frases",
  "vantagens_operador": ["..."],
  "gaps_mercado": ["oportunidades que ninguém explora bem"],
  "riscos": ["ameaças competitivas"],
  "por_concorrente": [
    {
      "nome": "Nome do ${saas ? "player" : "concorrente"}",
      "nivel_ameaca": "alta|media|baixa",
      "onde_ganham": "texto",
      "onde_perdem": "texto",
      "angulo_contra": "${saas ? "como o operador deve se posicionar contra esta plataforma" : "como o operador deve se posicionar contra esta agência"}"
    }
  ],
  "recomendacoes": [
    { "prioridade": 1, "acao": "...", "justificativa": "..." }
  ],
  "battle_cards": [
    { "concorrente": "...", "objecao": "o que o prospect pode dizer", "resposta": "como responder" }
  ]
}
<<<END>>>`;
}
