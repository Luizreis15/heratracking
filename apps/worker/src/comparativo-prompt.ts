import type { MethodProfile, Operation } from "./types.js";
import { buildOperadorB2BContext } from "./operador-context.js";

export type ComparativoInput = {
  operation: Operation;
  profile: MethodProfile | null;
  operador: Record<string, unknown>;
  competitors: Array<Record<string, unknown>>;
  intelEvents: Array<Record<string, unknown>>;
};

export function buildComparativoPrompt(input: ComparativoInput): string {
  const { operation, profile, operador, competitors, intelEvents } = input;
  const operadorLabel =
    (typeof operador.nome === "string" && operador.nome.trim()) ||
    operation.posicionamento.split(/[—–-]/)[0]?.trim() ||
    "Operador";

  return `Você é o estrategista competitivo da agência **${operadorLabel}**.

## Contexto B2B
${buildOperadorB2BContext(operation, profile)}

## Briefing
- Nicho ICP: ${operation.nicho}
- Posicionamento agência: ${operation.posicionamento}
- Ticket-alvo: ${operation.ticket_alvo}
- Restrições: ${operation.restricoes}

## Perfil do operador (nós)
${JSON.stringify(operador, null, 2)}

## Concorrentes mapeados (${competitors.length})
${JSON.stringify(competitors, null, 2)}

## Inteligência recente (${intelEvents.length} eventos)
${intelEvents.length > 0 ? JSON.stringify(intelEvents.slice(0, 30), null, 2) : "Nenhum evento recente."}

## Tarefa
Produza uma **análise comparativa estratégica** cruzando operador × todos os concorrentes.

Regras:
- Compare **agências/consultorias** (operador B2B), nunca o ICP nem players do mercado do produto do ICP.
- Use dados fornecidos; complemente com WebSearch apenas para lacunas críticas (máx. 3 buscas).
- Marque inferências como hipótese. Não invente fatos.
- Respeite as restrições de compliance do briefing em recomendações de copy.
- Português BR, tom direto para sócios da agência.

Emita APENAS um bloco:
<<<HERA_COMPARATIVO>>>
{
  "resumo_executivo": "2-4 frases",
  "vantagens_operador": ["..."],
  "gaps_mercado": ["oportunidades que ninguém explora bem"],
  "riscos": ["ameaças competitivas"],
  "por_concorrente": [
    {
      "nome": "Nome da agência",
      "nivel_ameaca": "alta|media|baixa",
      "onde_ganham": "texto",
      "onde_perdem": "texto",
      "angulo_contra": "como o operador deve se posicionar contra esta agência"
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
