import type { IntelEventInput } from "./intel-types.js";
import type { CompetitorInput } from "./types.js";
import type { PhaseName } from "./constants.js";
import { PHASE_ORDER } from "./constants.js";

const PHASE_BLOCK_RE = /<<<HERA_PHASE:(\w+)>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const COMPETITORS_BLOCK_RE = /<<<HERA_COMPETITORS>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const SPIN_BLOCK_RE = /<<<HERA_SPIN>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const INTEL_BLOCK_RE = /<<<HERA_INTEL>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const COMPARATIVO_BLOCK_RE = /<<<HERA_COMPARATIVO>>>\s*([\s\S]*?)\s*<<<END>>>/g;
const CONTENT_BLOCK_RE = /<<<HERA_CONTENT>>>\s*([\s\S]*?)\s*<<<END>>>/g;

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

export type SpinGuide = {
  situacao: string[];
  problema: string[];
  implicacao: string[];
  necessidade: string[];
};

export function parseSpinBlock(
  text: string,
  alreadyProcessed: boolean,
): SpinGuide | null {
  if (alreadyProcessed) return null;

  SPIN_BLOCK_RE.lastIndex = 0;
  const match = SPIN_BLOCK_RE.exec(text);
  if (!match?.[1]) return null;

  const parsed = parseJsonObjectLoose(match[1]);
  if (!parsed) {
    console.warn("[worker] JSON inválido no bloco HERA_SPIN");
    return null;
  }
  if (
    !Array.isArray(parsed.situacao) ||
    !Array.isArray(parsed.problema) ||
    !Array.isArray(parsed.implicacao) ||
    !Array.isArray(parsed.necessidade)
  ) {
    return null;
  }
  return {
    situacao: (parsed.situacao as unknown[]).filter((s): s is string => typeof s === "string"),
    problema: (parsed.problema as unknown[]).filter((s): s is string => typeof s === "string"),
    implicacao: (parsed.implicacao as unknown[]).filter((s): s is string => typeof s === "string"),
    necessidade: (parsed.necessidade as unknown[]).filter(
      (s): s is string => typeof s === "string",
    ),
  };
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

export type ContentItem = {
  format: string;
  dor?: string;
  content: Record<string, unknown>;
};

export function parseContentBlock(text: string): ContentItem[] | null {
  CONTENT_BLOCK_RE.lastIndex = 0;
  const match = CONTENT_BLOCK_RE.exec(text);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item): item is ContentItem =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).format === "string" &&
        !!(item as Record<string, unknown>).content,
    );
  } catch {
    console.warn("[worker] JSON inválido no bloco HERA_CONTENT");
    return null;
  }
}

/** Remove cercas markdown e espaços extras ao redor do JSON */
export function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/** Extrai o primeiro objeto JSON balanceado (respeita strings escapadas) */
export function extractBalancedJsonSubstring(text: string, fromIndex = 0): string | null {
  const start = text.indexOf("{", fromIndex);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function repairTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, "$1");
}

/** Tenta parsear objeto JSON com tolerância a markdown e vírgulas finais */
export function parseJsonObjectLoose(raw: string): Record<string, unknown> | null {
  const cleaned = stripMarkdownFences(raw.trim());
  const candidates = [
    cleaned,
    extractBalancedJsonSubstring(cleaned) ?? "",
    repairTrailingCommas(cleaned),
    extractBalancedJsonSubstring(repairTrailingCommas(cleaned)) ?? "",
  ].filter((s) => s.length > 0);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* tenta próximo */
    }
  }
  return null;
}

export function parseRefineBlock(
  text: string,
  sectionKey: string,
): Record<string, unknown> | null {
  const ownMarker = `<<<HERA_REFINE:${sectionKey}>>>`;
  const hasOwnBlock = text.includes(ownMarker);
  const hasAnyBlock = /<<<HERA_REFINE:\w+>>>/.test(text);

  // Primary: bloco delimitado (para até o próximo marcador HERA ou END)
  const blockRe = new RegExp(
    `<<<HERA_REFINE:${sectionKey}>>>\\s*([\\s\\S]*?)(?=<<<END>>>|<<<HERA_[A-Z_]+>>>|$)`,
    "i",
  );
  const blockMatch = blockRe.exec(text);
  if (blockMatch?.[1]) {
    const parsed = parseJsonObjectLoose(blockMatch[1]);
    if (parsed) return parsed;
    console.warn(`[worker] JSON inválido no bloco HERA_REFINE:${sectionKey}`);
  }

  // Bloco sem <<<END>>> explícito (modelo às vezes omite)
  const looseBlockRe = new RegExp(
    `<<<HERA_REFINE:${sectionKey}>>>\\s*([\\s\\S]+)`,
    "i",
  );
  const looseMatch = looseBlockRe.exec(text);
  if (looseMatch?.[1] && !blockMatch) {
    const parsed = parseJsonObjectLoose(looseMatch[1]);
    if (parsed) {
      console.warn(`[worker] parseRefineBlock: bloco sem END para ${sectionKey}`);
      return parsed;
    }
  }

  if (hasAnyBlock && !hasOwnBlock) return null;

  // Fallback: primeiro bloco markdown
  const mdMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (mdMatch?.[1]) {
    const parsed = parseJsonObjectLoose(mdMatch[1]);
    if (parsed) {
      console.warn(`[worker] parseRefineBlock: fallback markdown para ${sectionKey}`);
      return parsed;
    }
  }

  // Last resort: brace-match após o marcador (ou do início)
  const searchFrom = hasOwnBlock ? text.indexOf(ownMarker) : 0;
  const jsonStr = extractBalancedJsonSubstring(text, searchFrom);
  if (jsonStr) {
    const parsed = parseJsonObjectLoose(jsonStr);
    if (parsed) {
      console.warn(`[worker] parseRefineBlock: fallback brace-match para ${sectionKey}`);
      return parsed;
    }
  }

  return null;
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
