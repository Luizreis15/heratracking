import type { Json } from "@/types/index";
import type { Operation } from "@/types/index";

export type OperadorProfile = {
  nome: string;
  url?: string;
  instagram?: string;
  oferta?: string;
  ticket?: string;
  posicionamento?: string;
  modelo_entrega?: string;
  pontos_fortes?: string;
  pontos_fracos?: string;
  angulos_criativos?: string[];
  notas?: string;
};

const PERFIL_KEY = "perfil";

export const DEFAULT_OPERADOR_PROFILE: OperadorProfile = {
  nome: "Hera DG",
  url: "https://digitalheramarketing.com.br",
  instagram: "",
  oferta: "Gestão de tráfego + assessoria estratégica para clínicas implantodontistas",
  ticket: "R$ 2.500 – R$ 4.000/mês",
  posicionamento:
    "Agência especializada em captação previsível de pacientes de implante e reabilitação oral, com compliance CFO/CFM",
  modelo_entrega: "Gestão de tráfego + assessoria estratégica",
  pontos_fortes:
    "Nicho ultra-focado, operação enxuta, linguagem que converte sem prometer resultado, compliance odonto",
  pontos_fracos: "Marca ainda em consolidação vs players com mais prova social",
  angulos_criativos: [
    "agenda cheia de implantes",
    "captação previsível",
    "marketing com compliance",
  ],
  notas: "Perfil interno da agência — base para comparação com concorrentes.",
};

export function parseOperadorProfile(extensoes: Json): OperadorProfile {
  if (!extensoes || typeof extensoes !== "object" || Array.isArray(extensoes)) {
    return { ...DEFAULT_OPERADOR_PROFILE };
  }
  const raw = (extensoes as Record<string, Json>)[PERFIL_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_OPERADOR_PROFILE };
  }
  const p = raw as Record<string, Json>;
  return {
    nome: typeof p.nome === "string" && p.nome.trim() ? p.nome : DEFAULT_OPERADOR_PROFILE.nome,
    url: str(p.url),
    instagram: str(p.instagram),
    oferta: str(p.oferta) ?? DEFAULT_OPERADOR_PROFILE.oferta,
    ticket: str(p.ticket) ?? DEFAULT_OPERADOR_PROFILE.ticket,
    posicionamento: str(p.posicionamento) ?? DEFAULT_OPERADOR_PROFILE.posicionamento,
    modelo_entrega: str(p.modelo_entrega) ?? DEFAULT_OPERADOR_PROFILE.modelo_entrega,
    pontos_fortes: str(p.pontos_fortes) ?? DEFAULT_OPERADOR_PROFILE.pontos_fortes,
    pontos_fracos: str(p.pontos_fracos) ?? DEFAULT_OPERADOR_PROFILE.pontos_fracos,
    angulos_criativos: arr(p.angulos_criativos) ?? DEFAULT_OPERADOR_PROFILE.angulos_criativos,
    notas: str(p.notas),
  };
}

export function mergeOperadorIntoExtensoes(
  extensoes: Json,
  perfil: OperadorProfile,
): Record<string, Json> {
  const base =
    extensoes && typeof extensoes === "object" && !Array.isArray(extensoes)
      ? { ...(extensoes as Record<string, Json>) }
      : {};
  base[PERFIL_KEY] = perfil as unknown as Json;
  return base;
}

export function profileFromOperation(op: Operation): OperadorProfile {
  return {
    nome: "Hera DG",
    oferta: op.modelo_entrega,
    ticket: op.ticket_alvo,
    posicionamento: op.posicionamento,
    modelo_entrega: op.modelo_entrega,
    notas: "Importado do briefing desta operação.",
  };
}

function str(v: Json | undefined): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function arr(v: Json | undefined): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function normalizeInstagramUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed;
  if (trimmed.startsWith("@")) return `https://instagram.com/${trimmed.slice(1)}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
