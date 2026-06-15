import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Anchored to the worker's skills folder — stable regardless of process.cwd()
const REFERENCES_BASE = path.resolve(
  __dirname,
  "../.claude/skills/arquiteto-de-agencia/references",
);

const cache = new Map<string, string>();

export function loadReference(relPath: string): string {
  const cached = cache.get(relPath);
  if (cached !== undefined) return cached;
  const full = path.join(REFERENCES_BASE, relPath);
  let content: string;
  try {
    content = fs.readFileSync(full, "utf-8");
  } catch {
    throw new Error(`[load-references] Reference não encontrado: ${full}`);
  }
  if (content.trim().length === 0) {
    throw new Error(`[load-references] Reference vazio: ${full}`);
  }
  cache.set(relPath, content);
  return content;
}

// References injected per group — worker reads from disk, not the agent
export const GROUP_A_REFS = [
  "00-operador-b2b.md",
  "00-output-contract.md",
  "02-escada-valor.md",
  "03-comercial.md",
] as const;

export const GROUP_B_REFS = [
  "00-operador-b2b.md",
  "00-output-contract.md",
  "04-posicionamento.md",
  "05-trafego-funil.md",
] as const;

export const BLUEPRINT_REFS = [
  "00-operador-b2b.md",
  "00-output-contract.md",
  "templates/blueprint-mestre.md",
] as const;

// Hybrid mode: all method references (phases 2–6)
export const CONTINUATION_REFS = [
  "00-operador-b2b.md",
  "00-output-contract.md",
  "02-escada-valor.md",
  "03-comercial.md",
  "04-posicionamento.md",
  "05-trafego-funil.md",
  "templates/blueprint-mestre.md",
] as const;

export function buildMethodBlock(refs: readonly string[]): string {
  const sections = refs
    .map((ref) => `### [${ref}]\n\n${loadReference(ref)}`)
    .join("\n\n---\n\n");
  return `## MÉTODO OBRIGATÓRIO — aplique exatamente este método, não improvise de memória\n\n${sections}`;
}
