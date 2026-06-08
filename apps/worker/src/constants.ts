import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do worker — contém .claude/skills e CLAUDE.md */
export const WORKER_ROOT = path.resolve(__dirname, "..");

export const PHASE_ORDER = [
  "pesquisa",
  "oferta",
  "comercial",
  "posicionamento",
  "trafego",
  "blueprint",
] as const;

export type PhaseName = (typeof PHASE_ORDER)[number];

/** Fase do contrato → chave em blueprints.sections */
export const PHASE_SECTION_KEY: Record<PhaseName, string> = {
  pesquisa: "mercado_icp",
  oferta: "oferta_escada",
  comercial: "comercial",
  posicionamento: "posicionamento",
  trafego: "trafego_funil",
  blueprint: "blueprint_meta",
};

export function nextPhase(current: PhaseName): PhaseName | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}
