import type { ConcorrenteSeed } from "./concorrente-seeds.js";
import { parseSeeds } from "./concorrente-seeds.js";

export type OperationStatus = "queued" | "running" | "done" | "error";
export type PhaseStatus = "pending" | "running" | "done" | "error";
export type JobMode = "full" | "concorrencia" | "intel" | "comparativo";

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
  concorrentes_seeds: ConcorrenteSeed[];
  job_mode: JobMode;
  status: OperationStatus;
  current_phase: string | null;
  cost_usd: number | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

export function normalizeOperation(row: Record<string, unknown>): Operation {
  return {
    ...(row as unknown as Operation),
    concorrentes_seeds: parseSeeds(row.concorrentes_seeds),
    job_mode:
      row.job_mode === "concorrencia"
        ? "concorrencia"
        : row.job_mode === "intel"
          ? "intel"
          : row.job_mode === "comparativo"
            ? "comparativo"
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
