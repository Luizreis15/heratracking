/** Mensagens user-facing para logs de geração — nunca expor nomes de modelos ou tools internas. */

import type { PhaseName } from "./constants.js";

export const GEN_COPY = {
  pesquisaStart: "Analisando o mercado e mapeando concorrentes...",
  ofertaStart: "Estruturando oferta e escada de valor...",
  comercialStart: "Montando processo comercial...",
  posicionamentoStart: "Definindo posicionamento digital...",
  trafegoStart: "Desenhando funil de tráfego...",
  blueprintStart: "Consolidando checklist e hipóteses...",
  ofertaComercialStart: "Montando oferta e processo comercial...",
  posicionamentoTrafegoStart: "Definindo posicionamento e funil de tráfego...",
  webSearch: (query: string) => `Pesquisando: ${query}`,
  metodologia: "Consultando metodologia do operador...",
  concorrenciaEnrich: (names: string) => `Enriquecendo mapa de concorrência — ${names}`,
  intelStart: "Varredura de inteligência competitiva iniciada...",
  intelMeta: (name: string) => `Monitorando redes sociais — ${name}`,
  comparativoStart: "Gerando análise comparativa estratégica...",
  comparativoDone: (n: number) => `Análise comparativa pronta (${n} concorrentes)`,
  contentRefineStart: "Ajustando peça de conteúdo...",
  contentRefineDone: "Peça de conteúdo atualizada",
  estruturaOperacional: "Montando estrutura operacional...",
} as const;

const PHASE_START: Record<PhaseName, string> = {
  pesquisa: GEN_COPY.pesquisaStart,
  oferta: GEN_COPY.ofertaStart,
  comercial: GEN_COPY.comercialStart,
  posicionamento: GEN_COPY.posicionamentoStart,
  trafego: GEN_COPY.trafegoStart,
  blueprint: GEN_COPY.blueprintStart,
};

export function phaseStartMessage(phase: PhaseName): string {
  return PHASE_START[phase];
}

export function swarmAgentStart(agentLabel: string): string {
  if (agentLabel.includes("oferta")) return GEN_COPY.ofertaComercialStart;
  if (agentLabel.includes("posicionamento")) return GEN_COPY.posicionamentoTrafegoStart;
  if (agentLabel.includes("blueprint")) return GEN_COPY.blueprintStart;
  return "Processando etapa...";
}
