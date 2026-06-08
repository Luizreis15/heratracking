import { formatSeedsForPrompt, parseSeeds } from "./concorrente-seeds.js";
import { isSaasB2B } from "./operador-tipo.js";
import type { MethodProfile, Operation } from "./types.js";

type OperadorPerfil = {
  nome?: string;
  url?: string;
  instagram?: string;
  oferta?: string;
  ticket?: string;
  posicionamento?: string;
  pontos_fortes?: string;
  pontos_fracos?: string;
};

function parseOperadorPerfil(profile: MethodProfile | null): OperadorPerfil | null {
  const ext = profile?.extensoes;
  if (!ext || typeof ext !== "object" || Array.isArray(ext)) return null;
  const p = (ext as Record<string, unknown>).perfil;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  return p as OperadorPerfil;
}

function formatOperadorPerfil(p: OperadorPerfil): string {
  const lines: string[] = [];
  if (p.nome) lines.push(`Nome: ${p.nome}`);
  if (p.url) lines.push(`Site: ${p.url}`);
  if (p.instagram) lines.push(`Instagram: ${p.instagram}`);
  if (p.ticket) lines.push(`Ticket: ${p.ticket}`);
  if (p.oferta) lines.push(`Oferta: ${p.oferta}`);
  if (p.posicionamento) lines.push(`Posicionamento: ${p.posicionamento}`);
  if (p.pontos_fortes) lines.push(`Fortes: ${p.pontos_fortes}`);
  if (p.pontos_fracos) lines.push(`Fracos: ${p.pontos_fracos}`);
  return lines.length > 0 ? lines.join("\n") : "";
}

/** Instruções da Fase 1 derivadas do briefing e do tipo de operador */
export function buildPesquisaPhaseInstructions(operation: Operation): string {
  if (isSaasB2B(operation)) {
    return `Duas pesquisas OBRIGATÓRIAS e distintas:

A) ICP (empresas compradoras): dores, desejos e critérios de compra de **${operation.nicho}** ao avaliar/contratar uma plataforma SaaS como a do operador.
   Buscas adaptadas: software homologação fornecedores, dores de compliance, ciclo de compra B2B, integração, LGPD.

B) Concorrência do OPERADOR: outras **plataformas, softwares e soluções SaaS** que competem pelo mesmo ICP.
   HERA_COMPETITORS = somente produtos/plataformas concorrentes. PROIBIDO listar agências de marketing ou o ICP como concorrente.
   ticket_estimado = preço típico de assinatura/contrato que o concorrente cobra do ICP (referência: ${operation.ticket_alvo}).

Use no mínimo 6 buscas distintas (3 para ICP + 3 para plataformas concorrentes).
Ao final, emita APENAS:
1) <<<HERA_PHASE:pesquisa>>> com JSON mercado_icp válido
2) <<<HERA_COMPETITORS>>> com no mínimo 3 players reais do mercado
3) <<<END>>> após cada bloco`;
  }

  return `Duas pesquisas OBRIGATÓRIAS e distintas:

A) ICP (cliente B2B): dores, desejos e linguagem de **${operation.nicho}** que CONTRATAM agência de marketing.
   Buscas adaptadas ao nicho: dificuldade de captação, contratar agência/gestão de tráfego, ROI de marketing B2B.

B) Concorrência do OPERADOR: outras **AGÊNCIAS ou consultorias** que vendem marketing para o mesmo nicho B2B.
   HERA_COMPETITORS = somente agências/consultorias. PROIBIDO listar clientes finais do ICP ou players do mercado do produto do ICP.
   ticket_estimado = retainer que a agência concorrente cobra do cliente B2B (referência: ${operation.ticket_alvo}).

Use no mínimo 6 buscas distintas (3 para ICP + 3 para agências).
Ao final, emita APENAS:
1) <<<HERA_PHASE:pesquisa>>> com JSON mercado_icp válido
2) <<<HERA_COMPETITORS>>> com no mínimo 3 agências concorrentes reais do operador
3) <<<END>>> após cada bloco`;
}

/**
 * Contexto B2B injetado em todo prompt do worker.
 * Ramifica entre agência de marketing e SaaS B2B.
 */
export function buildOperadorB2BContext(
  operation: Operation,
  methodProfile?: MethodProfile | null,
): string {
  const perfil = parseOperadorPerfil(methodProfile ?? null);
  const operadorNome =
    perfil?.nome?.trim() || operation.posicionamento.split(/[—–-]/)[0]?.trim() || "Operador";
  const perfilBlock = perfil
    ? `\n## Perfil interno do operador (para comparar com concorrentes)\n${formatOperadorPerfil(perfil)}\n`
    : "";

  if (isSaasB2B(operation)) {
    return `## MODELO SaaS B2B — LEIA ANTES DE TUDO

Você estrutura a operação de uma **EMPRESA DE SOFTWARE / PLATAFORMA B2B** (operador), NÃO uma agência de marketing.

| Papel | Quem é nesta operação |
|-------|----------------------|
| Operador (SaaS) | ${operadorNome} — ${operation.posicionamento} |
| ICP (empresas compradoras) | ${operation.nicho} |
| Concorrência (HERA_COMPETITORS) | Outras **plataformas/soluções SaaS** que competem pelo mesmo ICP |
| Ticket-alvo | ${operation.ticket_alvo} — valor que o **ICP paga pelo software** (assinatura/contrato) |

**ICP:** pesquise dores de **${operation.nicho}** ao contratar software (compliance, integração, ciclo de compra, ROI, churn de fornecedor anterior).

**HERA_COMPETITORS:** pesquise **plataformas e produtos concorrentes** no mesmo espaço de solução. NÃO liste agências de marketing nem confunda o ICP com concorrente.

**Go-to-market:** foque em modelo de negócio para **atrair e converter empresas** (demand gen B2B, outbound, conteúdo para decisores, parcerias).

**Compliance:** ${operation.restricoes}

## Seeds de concorrentes indicados pelo operador
${formatSeedsForPrompt(parseSeeds(operation.concorrentes_seeds))}

Pesquise e enriqueça CADA seed. Inclua em HERA_COMPETITORS com dados completos. Busque players adicionais além das seeds.
${perfilBlock}`;
  }

  return `## MODELO AGÊNCIA B2B — LEIA ANTES DE TUDO

Você estrutura a operação de uma **AGÊNCIA DE MARKETING** (operador), não do negócio do cliente final.

| Papel | Quem é nesta operação |
|-------|----------------------|
| Operador (agência) | ${operadorNome} — ver posicionamento no briefing |
| Cliente B2B / ICP | ${operation.nicho} |
| Concorrência (HERA_COMPETITORS) | Outras **agências/consultorias** que vendem marketing para esse mesmo ICP |
| Ticket-alvo | ${operation.ticket_alvo} — valor que o **cliente B2B paga à agência** (retainer/contrato) |

**ICP:** pesquise dores de **${operation.nicho}** que contratam agência (captação, previsibilidade, ROI, frustração com fornecedores anteriores).

**HERA_COMPETITORS:** pesquise **agências/consultorias** que atendem o mesmo ICP. Nunca liste o ICP nem empresas do mercado do produto do ICP como concorrente do operador.

**Compliance:** ${operation.restricoes}

## Concorrentes indicados manualmente pelo operador
${formatSeedsForPrompt(parseSeeds(operation.concorrentes_seeds))}

Pesquise e enriqueça CADA seed acima. Inclua-os em HERA_COMPETITORS com dados completos. Busque agências adicionais além das seeds.
${perfilBlock}`;
}
