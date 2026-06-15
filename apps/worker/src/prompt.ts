import { buildBriefingBlock, buildOperadorB2BContext } from "./operador-context.js";
import { isSaasB2B } from "./operador-tipo.js";
import { buildMethodBlock, CONTINUATION_REFS } from "./load-references.js";
import type { MethodProfile, Operation } from "./types.js";

export function buildPrompt(operation: Operation, profile: MethodProfile | null): string {
  const saas = isSaasB2B(operation);
  const extensoes = profile?.extensoes
    ? JSON.stringify(profile.extensoes, null, 2)
    : "Nenhuma extensão cadastrada — use o método-base dos references.";

  const fase1Rule = saas
    ? `3. Fase 1 — duas pesquisas: (A) ICP = dores de empresas que compram software; (B) competitors = outras plataformas/soluções SaaS.
4. \`<<<HERA_COMPETITORS>>>\` = mínimo 3 **plataformas/softwares**. Nunca agências de marketing nem o ICP.`
    : `3. Fase 1 — duas pesquisas: (A) ICP = dores de quem contrata a agência; (B) competitors = outras agências do mesmo nicho B2B.
4. \`<<<HERA_COMPETITORS>>>\` = mínimo 3 **agências/consultorias**. Nunca o ICP nem players do mercado do produto do ICP.`;

  const role = saas ? "SaaS/plataforma B2B" : "agência de marketing";

  return `Execute o protocolo COMPLETO da skill arquiteto-de-agencia (Fases 1 a 6) para esta operação de **${role}**.

${buildOperadorB2BContext(operation, profile)}

${buildBriefingBlock(operation, profile)}

## Metodologia proprietária (pontos de extensão)
${extensoes}

## Instruções obrigatórias do worker
1. Leia \`references/00-operador-b2b.md\` e \`references/00-output-contract.md\` ANTES de qualquer saída.
2. Invoque a skill \`arquiteto-de-agencia\` e siga o protocolo completo sem pular fases.
${fase1Rule}
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
  const saas = isSaasB2B(operation);
  const extensoes = profile?.extensoes
    ? JSON.stringify(profile.extensoes, null, 2)
    : "Nenhuma extensão cadastrada.";

  const phasesHint = saas
    ? "Fases 2 a 6 com foco GTM SaaS: pricing/tiers, vendas B2B, posicionamento de produto, demand gen, checklist de implementação."
    : "Fases 2 a 6: oferta, comercial, posicionamento, trafego, blueprint.";

  return `Execute o protocolo da skill arquiteto-de-agencia a partir da **Fase 2** (oferta).

## IMPORTANTE — Fase 1 JÁ CONCLUÍDA
A pesquisa de mercado, ICP e concorrentes foi feita pelo Perplexity. **NÃO refaça a Fase 1.**
**NÃO emita <<<HERA_COMPETITORS>>>** — concorrentes já gravados.

## Dados da Fase 1 (use como insumo)
${JSON.stringify(sectionsSoFar, null, 2)}

${buildOperadorB2BContext(operation, profile)}

${buildBriefingBlock(operation, profile)}

## Metodologia proprietária
${extensoes}

${buildMethodBlock(CONTINUATION_REFS)}

## Instruções de execução
1. Execute somente Fases 2 a 6: ${phasesHint}
2. Ao concluir CADA fase, emita \`<<<HERA_PHASE:nome>>>\` com JSON válido.
3. Respeite compliance do briefing em toda copy.

Comece agora pela Fase 2 (Oferta).`;
}
