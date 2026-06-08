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

/** Valores sugeridos no bootstrap do workspace — não forçados por operação */
export const DEFAULT_OPERADOR_PROFILE: OperadorProfile = {
  nome: "Minha empresa",
  url: "",
  instagram: "",
  oferta: "",
  ticket: "",
  posicionamento: "",
  modelo_entrega: "",
  pontos_fortes: "",
  pontos_fracos: "",
  angulos_criativos: [],
  notas: "",
};

export function parseOperadorProfileJson(raw: Json | null | undefined): OperadorProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Record<string, Json>;
  return {
    nome: typeof p.nome === "string" ? p.nome : "",
    url: str(p.url),
    instagram: str(p.instagram),
    oferta: str(p.oferta),
    ticket: str(p.ticket),
    posicionamento: str(p.posicionamento),
    modelo_entrega: str(p.modelo_entrega),
    pontos_fortes: str(p.pontos_fortes),
    pontos_fracos: str(p.pontos_fracos),
    angulos_criativos: arr(p.angulos_criativos) ?? [],
    notas: str(p.notas),
  };
}

/** Legado: perfil no method_profiles.extensoes.perfil */
export function parseOperadorProfile(extensoes: Json): OperadorProfile {
  if (!extensoes || typeof extensoes !== "object" || Array.isArray(extensoes)) {
    return { ...DEFAULT_OPERADOR_PROFILE };
  }
  const raw = (extensoes as Record<string, Json>)[PERFIL_KEY];
  const parsed = parseOperadorProfileJson(raw);
  if (!parsed) return { ...DEFAULT_OPERADOR_PROFILE };
  return {
    ...DEFAULT_OPERADOR_PROFILE,
    ...parsed,
    nome: parsed.nome.trim() || DEFAULT_OPERADOR_PROFILE.nome,
  };
}

/** Perfil desta operação — coluna operations.operador_perfil */
export function parseOperadorFromOperation(
  operation: Operation | null | undefined,
  empresaFallback = "Minha empresa",
): OperadorProfile {
  const saved = parseOperadorProfileJson(operation?.operador_perfil ?? null);
  if (saved) {
    return {
      ...emptyOperador(empresaFallback),
      ...saved,
      nome: saved.nome.trim() || empresaFallback,
    };
  }
  return {
    ...emptyOperador(empresaFallback),
    ...profileFromOperation(operation, empresaFallback),
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

export function profileFromOperation(
  op: Operation | null | undefined,
  empresaNome = "Minha empresa",
): OperadorProfile {
  if (!op) return emptyOperador(empresaNome);
  return {
    nome: empresaNome,
    oferta: op.modelo_entrega || undefined,
    ticket: op.ticket_alvo || undefined,
    posicionamento: op.posicionamento || undefined,
    modelo_entrega: op.modelo_entrega || undefined,
    notas: "Importado do briefing desta operação.",
  };
}

function emptyOperador(nome: string): OperadorProfile {
  return { ...DEFAULT_OPERADOR_PROFILE, nome, angulos_criativos: [] };
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
