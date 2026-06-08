import { formatSeedsForPrompt, parseSeeds } from "./concorrente-seeds.js";
import type { MethodProfile, Operation } from "./types.js";

type OperadorPerfil = {
  nome?: string;
  url?: string;
  instagram?: string;
  oferta?: string;
  ticket?: string;
  posicionamento?: string;
  pontos_fortes?: string;
  pontos_fracos?: string;
};

function parseOperadorPerfil(profile: MethodProfile | null): OperadorPerfil | null {
  const ext = profile?.extensoes;
  if (!ext || typeof ext !== "object" || Array.isArray(ext)) return null;
  const p = (ext as Record<string, unknown>).perfil;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  return p as OperadorPerfil;
}

function formatOperadorPerfil(p: OperadorPerfil): string {
  const lines: string[] = [];
  if (p.nome) lines.push(`Nome: ${p.nome}`);
  if (p.url) lines.push(`Site: ${p.url}`);
  if (p.instagram) lines.push(`Instagram: ${p.instagram}`);
  if (p.ticket) lines.push(`Ticket: ${p.ticket}`);
  if (p.oferta) lines.push(`Oferta: ${p.oferta}`);
  if (p.posicionamento) lines.push(`Posicionamento: ${p.posicionamento}`);
  if (p.pontos_fortes) lines.push(`Fortes: ${p.pontos_fortes}`);
  if (p.pontos_fracos) lines.push(`Fracos: ${p.pontos_fracos}`);
  return lines.length > 0 ? lines.join("\n") : "";
}

/**
 * Contexto B2B injetado em todo prompt do worker.
 * Evita confundir ICP (clínica) com concorrência (outras agências).
 */
export function buildOperadorB2BContext(
  operation: Operation,
  methodProfile?: MethodProfile | null,
): string {
  const perfil = parseOperadorPerfil(methodProfile ?? null);
  const perfilBlock = perfil
    ? `\n## Perfil interno do operador (Hera DG — para comparar com concorrentes)\n${formatOperadorPerfil(perfil)}\n`
    : "";

  return `## MODELO B2B — LEIA ANTES DE TUDO

Você estrutura a operação de uma **AGÊNCIA DE MARKETING** (operador), não de uma clínica.

| Papel | Quem é nesta operação |
|-------|----------------------|
| Operador (agência) | Quem vende marketing — ver posicionamento no briefing |
| Cliente final / ICP | ${operation.nicho} |
| Concorrência (HERA_COMPETITORS) | Outras **agências** que vendem marketing para esse mesmo nicho B2B |
| Ticket-alvo | ${operation.ticket_alvo} — valor que o **cliente B2B paga à agência** (retainer/contrato) |

**ICP:** pesquise dores de **clínicas/dentistas implantodontistas** que contratam agência (agenda, leads, ROI, agência que falhou).

**HERA_COMPETITORS:** pesquise **agências** (ex.: agenciacomia.com.br, gestores de tráfego odonto). PROIBIDO listar clínicas de implante ou fabricantes.

**Ticket em competitors:** retainer que a agência concorrente cobra do dentista — NUNCA preço de implante para paciente final.

## Concorrentes indicados manualmente pelo operador
${formatSeedsForPrompt(parseSeeds(operation.concorrentes_seeds))}

Pesquise e enriqueça CADA seed acima. Inclua-os em HERA_COMPETITORS com dados completos. Busque agências adicionais além das seeds.
${perfilBlock}`;
}
