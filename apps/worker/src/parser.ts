import type { IntelEventInput } from "./intel-types.js";
import type { CompetitorInput } from "./types.js";
import type { PhaseName } from "./constants.js";
import { PHASE_ORDER } from "./constants.js";

const PHASE_BLOCK_RE = /<<<HERA_PHASE:(\w+)>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const COMPETITORS_BLOCK_RE = /<<<HERA_COMPETITORS>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const INTEL_BLOCK_RE = /<<<HERA_INTEL>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const COMPARATIVO_BLOCK_RE = /<<<HERA_COMPARATIVO>>>\s*([\s\S]*?)\s*<<<END>>>/g;

const INTEL_TYPES = new Set(["post", "landing", "criativo", "oferta", "outro"]);

export type ParsedPhase = {
  phase: PhaseName;
  data: Record<string, unknown>;
};

export function extractAssistantText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
    ) {
      parts.push(block.text);
    }
  }
  return parts.join("\n");
}

export function parsePhaseBlocks(
  text: string,
  alreadyProcessed: Set<string>,
): ParsedPhase[] {
  const found: ParsedPhase[] = [];
  for (const match of text.matchAll(PHASE_BLOCK_RE)) {
    const rawPhase = match[1];
    const jsonStr = match[2]?.trim();
    if (!rawPhase || !jsonStr || alreadyProcessed.has(rawPhase)) continue;
    if (!PHASE_ORDER.includes(rawPhase as PhaseName)) continue;

    try {
      const data = JSON.parse(jsonStr) as Record<string, unknown>;
      found.push({ phase: rawPhase as PhaseName, data });
    } catch {
      console.warn(`[worker] JSON inválido no bloco HERA_PHASE:${rawPhase}`);
    }
  }
  return found;
}

export function parseCompetitorsBlock(
  text: string,
  alreadyProcessed: boolean,
): CompetitorInput[] | null {
  if (alreadyProcessed) return null;

  COMPETITORS_BLOCK_RE.lastIndex = 0;
  const match = COMPETITORS_BLOCK_RE.exec(text);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (c): c is CompetitorInput =>
        !!c && typeof c === "object" && "nome" in c && typeof c.nome === "string",
    );
  } catch {
    console.warn("[worker] JSON inválido no bloco HERA_COMPETITORS");
    return null;
  }
}

export function parseIntelBlock(text: string): IntelEventInput[] | null {
  INTEL_BLOCK_RE.lastIndex = 0;
  const match = INTEL_BLOCK_RE.exec(text);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((e): e is IntelEventInput => {
      if (!e || typeof e !== "object") return false;
      const row = e as IntelEventInput;
      return (
        typeof row.competitor_nome === "string" &&
        row.competitor_nome.trim().length > 0 &&
        typeof row.titulo === "string" &&
        row.titulo.trim().length > 0 &&
        typeof row.event_type === "string" &&
        INTEL_TYPES.has(row.event_type)
      );
    });
  } catch {
    console.warn("[worker] JSON inválido no bloco HERA_INTEL");
    return null;
  }
}

export function parseComparativoBlock(text: string): Record<string, unknown> | null {
  COMPARATIVO_BLOCK_RE.lastIndex = 0;
  const match = COMPARATIVO_BLOCK_RE.exec(text);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.resumo_executivo !== "string") return null;
    return parsed;
  } catch {
    console.warn("[worker] JSON inválido no bloco HERA_COMPARATIVO");
    return null;
  }
}

export function toolLogLine(toolName: string, toolInput: unknown): string {
  if (toolName === "WebSearch") {
    const query =
      toolInput &&
      typeof toolInput === "object" &&
      "query" in toolInput &&
      typeof toolInput.query === "string"
        ? toolInput.query
        : "mercado";
    return `🔍 Pesquisando: ${query}`;
  }
  if (toolName === "Skill") {
    return "⚙️ Executando skill arquiteto-de-agencia...";
  }
  if (toolName === "Read" || toolName === "Glob" || toolName === "Grep") {
    return `📄 ${toolName}...`;
  }
  return `🔧 ${toolName}...`;
}
