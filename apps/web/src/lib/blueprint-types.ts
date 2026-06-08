// Tipos tipados para cada seção do Blueprint Operacional Mestre.
// Baseados no output-contract.md — o LLM pode variar, então todos os campos são opcionais.

export type MercadoIcpData = {
  resumo_mercado?: unknown;
  nivel_consciencia?: number;
  icp?: {
    quem_e?: string;
    situacao_gatilho?: string;
    dores?: unknown;
    desejos?: unknown;
    objecoes?: unknown;
    onde_esta?: unknown;
  };
  filtro_perfil?: {
    verde?: unknown;
    amarelo?: unknown;
    vermelho?: unknown;
  };
};

export type EscadaDegrau = {
  nome?: string;
  descricao?: string;
  preco?: string;
  tipo?: string;
};

export type OfertaEscadaData = {
  equacao_valor?: string;
  escada?: unknown[];
  oferta_principal?: {
    promessa?: string;
    mecanismo_unico?: string;
    inclusos?: unknown;
    garantia?: string;
    bonus?: unknown;
    escassez?: string;
  };
  precificacao?: string;
};

export type ComercialData = {
  funil_comercial?: unknown[];
  sdr?: {
    criterios?: unknown;
    scripts?: unknown;
  };
  closer?: {
    roteiro_call?: unknown;
    perguntas?: unknown;
  };
  carta_vendas?: string;
  pitch_stacking?: string;
};

export type PosicionamentoData = {
  statement?: string;
  narrativa?: {
    heroi?: string;
    problema?: string;
    guia?: string;
    plano?: string;
    cta?: string;
  };
  pilares_conteudo?: unknown[];
  linha_editorial?: {
    mix?: string;
    formatos?: unknown;
    cadencia?: string;
    bio_cta?: string;
  };
};

export type AngloCriativo = {
  gancho?: string;
  corpo?: string;
  cta?: string;
  angulo?: string;
  titulo?: string;
};

export type TrafegoFunilData = {
  mapa_funil?: unknown[];
  jornada_cliente?: unknown[];
  campanhas?: unknown[];
  angulos_criativos?: unknown[];
  mensuracao?: {
    kpis?: unknown;
    tracking?: string;
    ritual?: string;
  };
};

// ── helpers ────────────────────────────────────────────────────────────────

export function asStrings(val: unknown): string[] {
  if (!Array.isArray(val)) return typeof val === "string" && val ? [val] : [];
  return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function asString(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) return asStrings(val).join(", ");
  return "";
}

export function toStringOrObj(val: unknown): string | Record<string, unknown> | null {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, unknown>;
  return null;
}
