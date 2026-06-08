import type { Competitor } from "@/types/index";
import type { OperadorProfile } from "@/lib/operador-profile";

export type CompareRow = {
  id: string;
  label: string;
  ours: (p: OperadorProfile) => string | undefined;
  theirs: (c: Competitor) => string | undefined;
  multiline?: boolean;
};

export const COMPARISON_ROWS: CompareRow[] = [
  {
    id: "ticket",
    label: "Ticket",
    ours: (p) => p.ticket,
    theirs: (c) => c.ticket_estimado ?? undefined,
  },
  {
    id: "oferta",
    label: "Oferta",
    ours: (p) => p.oferta,
    theirs: (c) => c.oferta ?? undefined,
    multiline: true,
  },
  {
    id: "posicionamento",
    label: "Posicionamento",
    ours: (p) => p.posicionamento,
    theirs: (c) => c.posicionamento ?? undefined,
    multiline: true,
  },
  {
    id: "fortes",
    label: "Pontos fortes",
    ours: (p) => p.pontos_fortes,
    theirs: (c) => c.pontos_fortes ?? undefined,
    multiline: true,
  },
  {
    id: "fracos",
    label: "Pontos fracos",
    ours: (p) => p.pontos_fracos,
    theirs: (c) => c.pontos_fracos ?? undefined,
    multiline: true,
  },
];

export function ourAngulos(p: OperadorProfile): string[] {
  return p.angulos_criativos ?? [];
}

export function theirAngulos(c: Competitor): string[] {
  if (!Array.isArray(c.angulos_criativos)) return [];
  return c.angulos_criativos.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}
