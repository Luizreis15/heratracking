import type { ConcorrenteSeed } from "./concorrente-seeds.js";
import { parseSeeds } from "./concorrente-seeds.js";

export type OperationStatus = "queued" | "running" | "done" | "error";
export type PhaseStatus = "pending" | "running" | "done" | "error";
export type JobMode = "full" | "concorrencia" | "intel" | "comparativo" | "refine_section" | "content_generation";
export type OperadorTipo = "agencia" | "saas_b2b";

export type { ConcorrenteSeed };

export type Operation = {
  id: string;
  workspace_id: string;
  created_by: string;
  nicho: string;
  posicionamento: string;
  ticket_alvo: string;
  modelo_entrega: string;
  restricoes: string;
  operador_tipo: OperadorTipo;
  operador_perfil: Record<string, unknown> | null;
  refine_params: {
    section_key: string;
    instruction: string;
    focus_field?: string;
  } | null;
  content_params: {
    mode?: "generate" | "refine";
    dores?: string[];
    formats?: string[];
    funil_etapas?: Array<"topo" | "meio" | "fundo">;
    angulos?: Array<{ gancho?: string; corpo?: string; cta?: string; titulo?: string }>;
    refine_item_id?: string;
    instruction?: string;
  } | null;
  concorrentes_seeds: ConcorrenteSeed[];
  job_mode: JobMode;
  status: OperationStatus;
  current_phase: string | null;
  cost_usd: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export function normalizeOperation(row: Record<string, unknown>): Operation {
  return {
    ...(row as unknown as Operation),
    concorrentes_seeds: parseSeeds(row.concorrentes_seeds),
    operador_perfil:
      row.operador_perfil &&
      typeof row.operador_perfil === "object" &&
      !Array.isArray(row.operador_perfil)
        ? (row.operador_perfil as Record<string, unknown>)
        : null,
    refine_params:
      row.refine_params &&
      typeof row.refine_params === "object" &&
      !Array.isArray(row.refine_params) &&
      typeof (row.refine_params as Record<string, unknown>).section_key === "string" &&
      typeof (row.refine_params as Record<string, unknown>).instruction === "string"
        ? {
            section_key: (row.refine_params as Record<string, unknown>).section_key as string,
            instruction: (row.refine_params as Record<string, unknown>).instruction as string,
            focus_field:
              typeof (row.refine_params as Record<string, unknown>).focus_field === "string"
                ? ((row.refine_params as Record<string, unknown>).focus_field as string)
                : undefined,
          }
        : null,
    content_params: (() => {
      const p = row.content_params;
      if (!p || typeof p !== "object" || Array.isArray(p)) return null;
      const obj = p as Record<string, unknown>;
      if (obj.mode === "refine") {
        if (typeof obj.refine_item_id !== "string" || typeof obj.instruction !== "string") return null;
        return {
          mode: "refine" as const,
          refine_item_id: obj.refine_item_id,
          instruction: obj.instruction,
        };
      }
      if (!Array.isArray(obj.dores) || !Array.isArray(obj.formats)) return null;
      const funil = Array.isArray(obj.funil_etapas)
        ? (obj.funil_etapas as unknown[]).filter(
            (f): f is "topo" | "meio" | "fundo" =>
              f === "topo" || f === "meio" || f === "fundo",
          )
        : undefined;
      return {
        mode: "generate" as const,
        dores: obj.dores as string[],
        formats: obj.formats as string[],
        funil_etapas: funil?.length ? funil : (["topo", "meio", "fundo"] as const),
        angulos: Array.isArray(obj.angulos)
          ? (obj.angulos as Array<{
              gancho?: string;
              corpo?: string;
              cta?: string;
              titulo?: string;
            }>)
          : undefined,
      };
    })(),
    operador_tipo:
      row.operador_tipo === "saas_b2b" ? "saas_b2b" : "agencia",
    job_mode:
      row.job_mode === "concorrencia"
        ? "concorrencia"
        : row.job_mode === "intel"
          ? "intel"
          : row.job_mode === "comparativo"
            ? "comparativo"
            : row.job_mode === "refine_section"
              ? "refine_section"
              : row.job_mode === "content_generation"
                ? "content_generation"
                : "full",
  };
}

export type MethodProfile = {
  id: string;
  workspace_id: string;
  nicho: string;
  posicionamento: string;
  extensoes: Record<string, unknown>;
  updated_at: string;
};

export type CompetitorInput = {
  nome: string;
  url?: string | null;
  instagram?: string | null;
  posicionamento?: string | null;
  oferta?: string | null;
  ticket_estimado?: string | null;
  pontos_fortes?: string | null;
  pontos_fracos?: string | null;
  angulos_criativos?: unknown[] | null;
  fonte?: string | null;
};

export type BlueprintSections = Record<string, unknown>;
