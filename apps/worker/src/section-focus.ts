/** Campos refináveis por seção (focus_field no refine_params) */

export const SECTION_FOCUS_FIELDS: Record<string, ReadonlySet<string>> = {
  mercado_icp: new Set(["icp", "filtro_perfil", "resumo_mercado"]),
  oferta_escada: new Set(["equacao_valor", "escada", "oferta_principal", "precificacao"]),
  comercial: new Set(["funil_comercial", "sdr", "closer", "carta_vendas", "pitch_stacking"]),
  posicionamento: new Set(["statement", "narrativa", "pilares_conteudo", "linha_editorial"]),
  trafego_funil: new Set([
    "mapa_funil",
    "jornada_cliente",
    "campanhas",
    "angulos_criativos",
    "mensuracao",
  ]),
  checklist: new Set(["checklist"]),
  hipoteses: new Set(["hipoteses"]),
};

export const FOCUS_FIELD_SCHEMA: Record<string, string> = {
  icp: `{ "icp": { "quem_e": "", "situacao_gatilho": "", "dores": [], "desejos": [], "objecoes": [], "onde_esta": [] } }`,
  filtro_perfil: `{ "filtro_perfil": { "verde": [], "amarelo": [], "vermelho": [] } }`,
  resumo_mercado: `{ "resumo_mercado": [], "nivel_consciencia": 3 }`,
  equacao_valor: `{ "equacao_valor": "" }`,
  escada: `{ "escada": [] }`,
  oferta_principal: `{ "oferta_principal": { "promessa": "", "mecanismo_unico": "", "inclusos": [], "garantia": "", "bonus": [], "escassez": "" } }`,
  precificacao: `{ "precificacao": "" }`,
  funil_comercial: `{ "funil_comercial": ["etapa — responsável"] }`,
  sdr: `{ "sdr": { "criterios": [], "scripts": [] } }`,
  closer: `{ "closer": { "roteiro_call": [], "perguntas": [] } }`,
  carta_vendas: `{ "carta_vendas": "Use blocos [LEAD], [PAS], [MECANISMO], [PROVA], [OFERTA], [GARANTIA], [CTA], [FAQ]" }`,
  pitch_stacking: `{ "pitch_stacking": "" }`,
  statement: `{ "statement": "" }`,
  narrativa: `{ "narrativa": { "heroi": "", "problema": "", "guia": "", "plano": "", "cta": "" } }`,
  pilares_conteudo: `{ "pilares_conteudo": [] }`,
  linha_editorial: `{ "linha_editorial": { "mix": "", "formatos": [], "cadencia": "", "bio_cta": "" } }`,
  mapa_funil: `{ "mapa_funil": [] }`,
  jornada_cliente: `{ "jornada_cliente": [] }`,
  campanhas: `{ "campanhas": [] }`,
  angulos_criativos: `{ "angulos_criativos": [] }`,
  mensuracao: `{ "mensuracao": { "kpis": [], "tracking": "", "ritual": "" } }`,
  checklist: `{ "checklist": [] }`,
  hipoteses: `{ "hipoteses": [] }`,
};

export const FOCUS_FIELD_LABELS: Record<string, string> = {
  icp: "ICP",
  filtro_perfil: "Filtro de Perfil",
  resumo_mercado: "Resumo de Mercado",
  equacao_valor: "Equação de Valor",
  escada: "Escada de Valor",
  oferta_principal: "Oferta Principal",
  precificacao: "Precificação",
  funil_comercial: "Funil Comercial",
  sdr: "SDR",
  closer: "Closer",
  carta_vendas: "Carta de Vendas",
  pitch_stacking: "Pitch de Fechamento",
  statement: "Statement",
  narrativa: "Narrativa StoryBrand",
  pilares_conteudo: "Pilares de Conteúdo",
  linha_editorial: "Linha Editorial",
  mapa_funil: "Mapa do Funil",
  jornada_cliente: "Jornada do Cliente",
  campanhas: "Campanhas",
  angulos_criativos: "Ângulos Criativos",
  mensuracao: "Mensuração",
  checklist: "Checklist",
  hipoteses: "Hipóteses",
};

export function isValidFocusField(sectionKey: string, focusField: string): boolean {
  return SECTION_FOCUS_FIELDS[sectionKey]?.has(focusField) ?? false;
}

export function mergeSectionPartial(
  current: Record<string, unknown>,
  refined: Record<string, unknown>,
  focusField: string,
): Record<string, unknown> {
  const merged = { ...current };
  if (focusField in refined) {
    merged[focusField] = refined[focusField];
  } else {
    merged[focusField] = refined;
  }
  return merged;
}
