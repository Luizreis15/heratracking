import { buildOperadorB2BContext } from "./operador-context.js";
import type { MethodProfile, Operation } from "./types.js";

export function buildPrompt(operation: Operation, profile: MethodProfile | null): string {
  const extensoes = profile?.extensoes
    ? JSON.stringify(profile.extensoes, null, 2)
    : "Nenhuma extensão cadastrada — use o método-base dos references.";

  return `Execute o protocolo COMPLETO da skill arquiteto-de-agencia (Fases 1 a 6) para esta operação.

${buildOperadorB2BContext(operation, profile)}

## Briefing (Fase 0)
- **Cliente B2B que a agência quer atender:** ${operation.nicho}
- **Posicionamento da agência (operador):** ${operation.posicionamento}
- **Ticket-alvo (cliente B2B → agência):** ${operation.ticket_alvo}
- **Modelo de entrega:** ${operation.modelo_entrega}
- **Restrições e compliance:** ${operation.restricoes}

## Metodologia proprietária (pontos de extensão)
${extensoes}

## Instruções obrigatórias do worker
1. Leia \`references/00-operador-b2b.md\` e \`references/00-output-contract.md\` ANTES de qualquer saída.
2. Invoque a skill \`arquiteto-de-agencia\` e siga o protocolo completo sem pular fases.
3. Fase 1 — duas pesquisas: (A) ICP = dores de quem contrata a agência; (B) competitors = outras agências do mesmo nicho B2B.
4. \`<<<HERA_COMPETITORS>>>\` = mínimo 3 **agências/consultorias**. Nunca o ICP nem players do mercado do produto do ICP.
5. Ao concluir CADA fase, emita \`<<<HERA_PHASE:nome>>>\` com JSON válido conforme o contrato.
6. Respeite compliance do briefing em toda copy gerada.
7. Marque hipóteses explicitamente — não trate estimativas como fatos.

Comece agora pela Fase 1 (Pesquisa + ICP).`;
}

/** Fases 2–6 após pesquisa já feita pelo Perplexity (motor híbrido). */
export function buildContinuationPrompt(
  operation: Operation,
  profile: MethodProfile | null,
  sectionsSoFar: Record<string, unknown>,
): string {
  const extensoes = profile?.extensoes
    ? JSON.stringify(profile.extensoes, null, 2)
    : "Nenhuma extensão cadastrada.";

  return `Execute o protocolo da skill arquiteto-de-agencia a partir da **Fase 2** (oferta).

## IMPORTANTE — Fase 1 JÁ CONCLUÍDA
A pesquisa de mercado, ICP e concorrentes foi feita pelo Perplexity. **NÃO refaça a Fase 1.**
**NÃO emita <<<HERA_COMPETITORS>>>** — concorrentes já gravados.

## Dados da Fase 1 (use como insumo)
${JSON.stringify(sectionsSoFar, null, 2)}

${buildOperadorB2BContext(operation, profile)}

## Briefing (Fase 0)
- **Cliente B2B:** ${operation.nicho}
- **Posicionamento da agência:** ${operation.posicionamento}
- **Ticket-alvo:** ${operation.ticket_alvo}
- **Modelo de entrega:** ${operation.modelo_entrega}
- **Restrições:** ${operation.restricoes}

## Metodologia proprietária
${extensoes}

## Instruções
1. Leia \`references/00-output-contract.md\` antes de emitir blocos.
2. Invoque a skill \`arquiteto-de-agencia\` e execute **somente Fases 2 a 6**: oferta, comercial, posicionamento, trafego, blueprint.
3. Ao concluir CADA fase, emita \`<<<HERA_PHASE:nome>>>\` com JSON válido.
4. Respeite compliance do briefing em toda copy.

Comece agora pela Fase 2 (Oferta).`;
}
