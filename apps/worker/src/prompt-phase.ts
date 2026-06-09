import { buildBriefingBlock, buildOperadorB2BContext } from "./operador-context.js";
import { isSaasB2B } from "./operador-tipo.js";
import type { MethodProfile, Operation } from "./types.js";

function extensoesStr(profile: MethodProfile | null): string {
  return profile?.extensoes
    ? JSON.stringify(profile.extensoes, null, 2)
    : "Nenhuma extensão cadastrada.";
}

/**
 * Grupo A: Oferta + Comercial (fases 2 e 3).
 * Recebe pesquisa já concluída. Não toca em posicionamento, tráfego ou blueprint.
 */
export function buildGroupAPrompt(
  operation: Operation,
  profile: MethodProfile | null,
  pesquisaData: Record<string, unknown>,
): string {
  const saas = isSaasB2B(operation);
  const ofertaHint = saas
    ? "Fase 2: pricing/tiers, freemium vs premium, proposta de valor SaaS.\nFase 3: ciclo de venda B2B, outbound, deck de produto, objeções enterprise."
    : "Fase 2: escada de valor e oferta principal.\nFase 3: processo comercial — SDR, closer, roteiro de call, carta de vendas, oferta no pitch.";

  return `Execute **somente Fases 2 e 3** da skill arquiteto-de-agencia.

## IMPORTANTE — Fases fora do escopo deste agente
NÃO execute Fase 1 (já concluída pelo Perplexity).
NÃO execute Fases 4, 5 ou 6 — outro agente cuidará delas em paralelo.
NÃO emita <<<HERA_COMPETITORS>>> — concorrentes já gravados.

## Dados da Fase 1 (use como insumo)
${JSON.stringify(pesquisaData, null, 2)}

${buildOperadorB2BContext(operation, profile)}

${buildBriefingBlock(operation, profile)}

## Metodologia proprietária
${extensoesStr(profile)}

## Instruções
1. Leia \`references/00-output-contract.md\` antes de emitir blocos.
2. Invoque a skill \`arquiteto-de-agencia\` e execute **somente**:
   ${ofertaHint}
3. Ao concluir CADA fase, emita \`<<<HERA_PHASE:nome>>>\` com JSON válido e \`<<<END>>>\`.
4. Respeite compliance do briefing.

Comece pela Fase 2 (Oferta).`;
}

/**
 * Grupo B: Posicionamento + Tráfego (fases 4 e 5).
 * Recebe pesquisa já concluída. Roda em paralelo com o Grupo A.
 */
export function buildGroupBPrompt(
  operation: Operation,
  profile: MethodProfile | null,
  pesquisaData: Record<string, unknown>,
): string {
  const saas = isSaasB2B(operation);
  const posHint = saas
    ? "Fase 4: posicionamento de produto, pilares de conteúdo para decisores B2B, thought leadership.\nFase 5: demand gen B2B, canais de aquisição, funil PLG ou sales-led."
    : "Fase 4: posicionamento digital e pilares de conteúdo.\nFase 5: tráfego, funil, jornada do cliente e aquisição.";

  return `Execute **somente Fases 4 e 5** da skill arquiteto-de-agencia.

## IMPORTANTE — Fases fora do escopo deste agente
NÃO execute Fases 1, 2 ou 3 — outros processos cuidam delas.
NÃO execute Fase 6 — o blueprint é montado após todos os grupos concluírem.
NÃO emita <<<HERA_COMPETITORS>>> — concorrentes já gravados.

## Dados da Fase 1 (use como insumo)
${JSON.stringify(pesquisaData, null, 2)}

${buildOperadorB2BContext(operation, profile)}

${buildBriefingBlock(operation, profile)}

## Metodologia proprietária
${extensoesStr(profile)}

## Instruções
1. Leia \`references/00-output-contract.md\` antes de emitir blocos.
2. Invoque a skill \`arquiteto-de-agencia\` e execute **somente**:
   ${posHint}
3. Ao concluir CADA fase, emita \`<<<HERA_PHASE:nome>>>\` com JSON válido e \`<<<END>>>\`.
4. Respeite compliance do briefing.

Comece pela Fase 4 (Posicionamento).`;
}

/**
 * Blueprint (fase 6): síntese final após Grupos A e B concluídos.
 * Recebe todas as seções anteriores consolidadas.
 */
export function buildBlueprintPrompt(
  operation: Operation,
  profile: MethodProfile | null,
  allSections: Record<string, unknown>,
): string {
  const saas = isSaasB2B(operation);
  const hint = saas
    ? "Monte o Blueprint Operacional Mestre com foco GTM SaaS: roadmap de go-to-market, checklist de implementação, hipóteses a validar."
    : "Monte o Blueprint Operacional Mestre consolidando todas as fases: oferta, comercial, posicionamento, tráfego, funil, checklist de implementação.";

  return `Execute **somente a Fase 6** (Blueprint) da skill arquiteto-de-agencia.

## IMPORTANTE
Fases 1 a 5 já foram concluídas. Sua missão é APENAS sintetizar no Blueprint Operacional Mestre.
NÃO repita nem resuma as seções anteriores — referencie-as e construa o documento integrador.

## Todas as seções anteriores (insumo)
${JSON.stringify(allSections, null, 2)}

${buildOperadorB2BContext(operation, profile)}

${buildBriefingBlock(operation, profile)}

## Metodologia proprietária
${extensoesStr(profile)}

## Instruções
1. Leia \`references/00-output-contract.md\` e \`references/templates/blueprint-mestre.md\`.
2. ${hint}
3. Emita \`<<<HERA_PHASE:blueprint>>>\` com JSON válido e \`<<<END>>>\`.
4. Respeite compliance do briefing.

Comece a Fase 6 (Blueprint).`;
}
