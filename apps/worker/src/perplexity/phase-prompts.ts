import { readFile } from "node:fs/promises";
import path from "node:path";
import { WORKER_ROOT, type PhaseName } from "../constants.js";
import { buildOperadorB2BContext, buildPesquisaPhaseInstructions } from "../operador-context.js";
import { isSaasB2B } from "../operador-tipo.js";
import type { MethodProfile, Operation } from "../types.js";

const SKILL_REF = path.join(
  WORKER_ROOT,
  ".claude/skills/arquiteto-de-agencia/references",
);

const PHASE_META: Record<
  PhaseName,
  { title: string; reference: string | null; instructions: string }
> = {
  pesquisa: {
    title: "Fase 1 — Pesquisa de mercado + ICP",
    reference: "01-pesquisa-icp.md",
    instructions: "", // preenchido dinamicamente em buildPhaseMessages
  },
  oferta: {
    title: "Fase 2 — Escada de valor + oferta principal",
    reference: "02-escada-valor.md",
    instructions: `Com base no ICP da fase anterior, desenhe escada de valor e oferta principal.
Ao final, emita APENAS <<<HERA_PHASE:oferta>>> com JSON válido <<<END>>>`,
  },
  comercial: {
    title: "Fase 3 — Processo comercial",
    reference: "03-comercial.md",
    instructions: `Desenhe funil comercial, SDR, closer, roteiro de call e carta de vendas.
Ao final, emita APENAS <<<HERA_PHASE:comercial>>> com JSON válido <<<END>>>`,
  },
  posicionamento: {
    title: "Fase 4 — Posicionamento digital",
    reference: "04-posicionamento.md",
    instructions: `Defina statement, narrativa, pilares de conteúdo e linha editorial.
Ao final, emita APENAS <<<HERA_PHASE:posicionamento>>> com JSON válido <<<END>>>`,
  },
  trafego: {
    title: "Fase 5 — Tráfego, funil e aquisição",
    reference: "05-trafego-funil.md",
    instructions: `Desenhe mapa de funil, jornada, campanhas, ângulos criativos e mensuração.
Ao final, emita APENAS <<<HERA_PHASE:trafego>>> com JSON válido <<<END>>>`,
  },
  blueprint: {
    title: "Fase 6 — Consolidação (checklist + hipóteses)",
    reference: "templates/blueprint-mestre.md",
    instructions: `Consolide checklist de implementação e hipóteses a validar.
Ao final, emita APENAS <<<HERA_PHASE:blueprint>>> com JSON { checklist, hipoteses } <<<END>>>`,
  },
};

let cachedContract: string | null = null;

async function loadOutputContract(): Promise<string> {
  if (cachedContract) return cachedContract;
  cachedContract = await readFile(
    path.join(SKILL_REF, "00-output-contract.md"),
    "utf-8",
  );
  return cachedContract;
}

async function loadReference(file: string | null): Promise<string> {
  if (!file) return "";
  try {
    return await readFile(path.join(SKILL_REF, file), "utf-8");
  } catch {
    return "";
  }
}

function briefingBlock(operation: Operation, profile: MethodProfile | null): string {
  const extensoes = profile?.extensoes
    ? JSON.stringify(profile.extensoes, null, 2)
    : "{}";

  return `## Briefing (Fase 0)
- Cliente B2B (ICP): ${operation.nicho}
- Posicionamento da agência: ${operation.posicionamento}
- Ticket cliente B2B→agência: ${operation.ticket_alvo}
- Modelo de entrega: ${operation.modelo_entrega}
- Restrições/compliance: ${operation.restricoes}

## Extensões do operador
${extensoes}`;
}

export async function buildPhaseMessages(
  phase: PhaseName,
  operation: Operation,
  profile: MethodProfile | null,
  sectionsSoFar: Record<string, unknown>,
): Promise<{ system: string; user: string }> {
  const meta = { ...PHASE_META[phase] };
  if (phase === "pesquisa") {
    meta.instructions = buildPesquisaPhaseInstructions(operation);
  }
  const contract = await loadOutputContract();
  const b2bModel = await loadReference("00-operador-b2b.md");
  const reference = await loadReference(meta.reference);

  const system = `Você é o Arquiteto de Agência HERA — estrutura operações de AGÊNCIAS DE MARKETING (modelo B2B).

Regras absolutas:
- ICP = quem contrata a agência. Concorrência = outras agências. Nunca inverta.
- Respeite compliance do briefing em toda copy gerada.
- Marque estimativas como hipóteses a validar.
- Sua resposta DEVE terminar com os blocos <<<HERA_...>>> — sem texto extra depois.

## Modelo B2B do operador
${b2bModel}

## Contrato de saída
${contract}`;

  const prior =
    Object.keys(sectionsSoFar).length > 0
      ? `## Saídas das fases anteriores (use como insumo)\n${JSON.stringify(sectionsSoFar, null, 2)}\n\n`
      : "";

  const user = `${buildOperadorB2BContext(operation, profile)}

${briefingBlock(operation, profile)}

${prior}## Tarefa atual
${meta.title}

${meta.instructions}

## Reference do método
${reference}`;

  return { system, user };
}

export async function buildConcorrenciaEnrichMessages(
  operation: Operation,
  profile: MethodProfile | null,
  existingCompetitors: Array<{ nome: string; url?: string | null; oferta?: string | null }>,
): Promise<{ system: string; user: string }> {
  const contract = await loadOutputContract();
  const b2bModel = await loadReference("00-operador-b2b.md");

  const saas = isSaasB2B(operation);
  const existingBlock =
    existingCompetitors.length > 0
      ? `## ${saas ? "Players" : "Agências"} já mapeados (enriqueça e não duplique)\n${JSON.stringify(existingCompetitors, null, 2)}`
      : `## ${saas ? "Players" : "Agências"} já mapeados\nNenhum ainda.`;

  const rulesBlock = saas
    ? `Você enriquece a análise de CONCORRÊNCIA de mercado de um SaaS B2B.

Regras:
- HERA_COMPETITORS = somente outras PLATAFORMAS/SOFTWARES concorrentes (nunca agências de marketing nem o ICP).
- Pesquise na web cada seed e cada player já mapeado.
- Encontre: oferta, ticket/assinatura, posicionamento, funcionalidades, pontos fortes/fracos.
- Inclua seeds + players atualizados + novos descobertos (mín. 1 novo se possível).`
    : `Você enriquece a análise de CONCORRÊNCIA B2B de uma agência de marketing.

Regras:
- HERA_COMPETITORS = somente outras AGÊNCIAS/consultorias (nunca o ICP nem players do mercado do produto do ICP).
- Pesquise na web cada seed manual e cada agência já mapeada.
- Encontre dados novos: oferta, ticket retainer, posicionamento, ângulos criativos, pontos fortes/fracos.
- Inclua seeds do operador + agências já mapeadas (atualizadas) + novas agências descobertas (mín. 1 nova se possível).`;

  const system = `${rulesBlock}

## Modelo do operador
${b2bModel}

## Contrato HERA_COMPETITORS
${contract}`;

  const user = `${buildOperadorB2BContext(operation, profile)}

${briefingBlock(operation, profile)}

${existingBlock}

## Tarefa
Enriquecer a análise de ${saas ? "players concorrentes do mercado" : "agências concorrentes"}.

Para seeds com Instagram: faça buscas web pelo @handle, nome do player, "${saas ? "plataforma" : "agência marketing"} ${operation.nicho}", site na bio, ofertas e depoimentos. Preencha url, instagram (URL completa https://instagram.com/handle), oferta, ticket_estimado, posicionamento, pontos_fortes/fracos com o máximo de dados encontrados — marque lacunas como hipótese.

NÃO retorne entradas vazias para seeds do operador. Cada seed manual deve virar um item completo em HERA_COMPETITORS.

Emita APENAS:
<<<HERA_COMPETITORS>>>
[ array completo — seeds enriquecidas + agências já mapeadas atualizadas + novas descobertas ]
<<<END>>>`;

  return { system, user };
}

export async function buildIntelScanMessages(
  operation: Operation,
  profile: MethodProfile | null,
  competitors: Array<{
    nome: string;
    url?: string | null;
    instagram?: string | null;
  }>,
  recentEvents: Array<{ competitor_nome: string; titulo: string; url?: string | null }>,
): Promise<{ system: string; user: string }> {
  const competitorList = competitors
    .map((c, i) => {
      const lines = [`${i + 1}. ${c.nome}`];
      if (c.url) lines.push(`   Site: ${c.url}`);
      if (c.instagram) lines.push(`   Instagram: ${c.instagram}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const knownBlock =
    recentEvents.length > 0
      ? `## Já registrado no feed (NÃO repetir)\n${recentEvents
          .slice(0, 40)
          .map((e) => `- [${e.competitor_nome}] ${e.titulo}${e.url ? ` — ${e.url}` : ""}`)
          .join("\n")}`
      : "## Já registrado no feed\nNenhum evento ainda.";

  const system = `Você é um analista de inteligência competitiva para uma agência de marketing B2B.

Busque na web atividade RECENTE (últimos 7–14 dias) de cada agência concorrente:
- Posts novos no Instagram/LinkedIn
- Novas landing pages ou alterações de site
- Criativos/ângulos de anúncio visíveis (Meta Ad Library, posts promocionais)
- Mudanças de oferta, preço ou posicionamento

Regras:
- Retorne SOMENTE novidades não listadas em "Já registrado".
- event_type: post | landing | criativo | oferta | outro
- Inclua url quando encontrar link direto.
- Se não houver novidade para uma agência, omita (não invente).
- Mínimo 0 eventos se nada novo; máximo 15 eventos no total.

Resposta APENAS com:
<<<HERA_INTEL>>>
[ JSON array de eventos ]
<<<END>>>`;

  const user = `${buildOperadorB2BContext(operation, profile)}

## Agências a monitorar
${competitorList || "Nenhuma — retorne array vazio."}

${knownBlock}

## Tarefa
Varredura de inteligência competitiva. Emita <<<HERA_INTEL>>> com array JSON:
[
  {
    "competitor_nome": "Nome da agência",
    "event_type": "post|landing|criativo|oferta|outro",
    "titulo": "Título curto da novidade",
    "resumo": "1-2 frases do que mudou",
    "url": "https://...",
    "fonte": "de onde veio a informação"
  }
]`;

  return { system, user };
}
