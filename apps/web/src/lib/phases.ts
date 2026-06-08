export const PHASES = [
  {
    key: "pesquisa",
    label: "Pesquisa + ICP",
    shortLabel: "Pesquisa",
    description: "Mercado, concorrentes e cliente ideal",
    sectionKeys: ["mercado_icp"],
  },
  {
    key: "oferta",
    label: "Oferta / Escada",
    shortLabel: "Oferta",
    description: "Precificação e escada de valor",
    sectionKeys: ["oferta_escada"],
  },
  {
    key: "comercial",
    label: "Comercial",
    shortLabel: "Comercial",
    description: "SDR, closer e carta de vendas",
    sectionKeys: ["comercial"],
  },
  {
    key: "posicionamento",
    label: "Posicionamento",
    shortLabel: "Posição",
    description: "Narrativa e pilares de conteúdo",
    sectionKeys: ["posicionamento"],
  },
  {
    key: "trafego",
    label: "Tráfego + Funil",
    shortLabel: "Tráfego",
    description: "Campanhas, criativos e KPIs",
    sectionKeys: ["trafego_funil"],
  },
  {
    key: "blueprint",
    label: "Blueprint",
    shortLabel: "Blueprint",
    description: "Consolidação e checklist",
    sectionKeys: ["checklist", "hipoteses"],
  },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];

export function phaseIndex(key: string): number {
  return PHASES.findIndex((p) => p.key === key);
}
