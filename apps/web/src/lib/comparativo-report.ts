export type ConcorrenteAnalise = {
  nome: string;
  nivel_ameaca: "alta" | "media" | "baixa";
  onde_ganham: string;
  onde_perdem: string;
  angulo_contra: string;
};

export type Recomendacao = {
  prioridade: number;
  acao: string;
  justificativa: string;
};

export type BattleCard = {
  concorrente: string;
  objecao: string;
  resposta: string;
};

export type ComparativoContent = {
  resumo_executivo: string;
  vantagens_operador: string[];
  gaps_mercado: string[];
  riscos: string[];
  por_concorrente: ConcorrenteAnalise[];
  recomendacoes: Recomendacao[];
  battle_cards: BattleCard[];
};

const AMEACA_LABELS: Record<ConcorrenteAnalise["nivel_ameaca"], string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function ameacaLabel(nivel: string): string {
  if (nivel === "alta" || nivel === "media" || nivel === "baixa") return AMEACA_LABELS[nivel];
  return nivel;
}

export function parseComparativoContent(raw: unknown): ComparativoContent | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.resumo_executivo !== "string") return null;

  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const porConcorrente = Array.isArray(c.por_concorrente)
    ? c.por_concorrente.filter((x): x is ConcorrenteAnalise => {
        if (!x || typeof x !== "object") return false;
        const r = x as ConcorrenteAnalise;
        return typeof r.nome === "string" && typeof r.onde_ganham === "string";
      })
    : [];

  const recomendacoes = Array.isArray(c.recomendacoes)
    ? c.recomendacoes.filter((x): x is Recomendacao => {
        if (!x || typeof x !== "object") return false;
        const r = x as Recomendacao;
        return typeof r.acao === "string" && typeof r.justificativa === "string";
      })
    : [];

  const battleCards = Array.isArray(c.battle_cards)
    ? c.battle_cards.filter((x): x is BattleCard => {
        if (!x || typeof x !== "object") return false;
        const r = x as BattleCard;
        return typeof r.concorrente === "string" && typeof r.resposta === "string";
      })
    : [];

  return {
    resumo_executivo: c.resumo_executivo,
    vantagens_operador: strArr(c.vantagens_operador),
    gaps_mercado: strArr(c.gaps_mercado),
    riscos: strArr(c.riscos),
    por_concorrente: porConcorrente,
    recomendacoes,
    battle_cards: battleCards,
  };
}
