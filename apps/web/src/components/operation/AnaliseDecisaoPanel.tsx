import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useComparisonReport } from "@/hooks/useComparisonReport";
import {
  ameacaLabel,
  parseComparativoContent,
  type ConcorrenteAnalise,
} from "@/lib/comparativo-report";
import { supabase } from "@/lib/supabase";

type Props = {
  operationId: string;
  empresaNome: string;
  competitorCount: number;
  busy: boolean;
};

export function AnaliseDecisaoPanel({
  operationId,
  empresaNome,
  competitorCount,
  busy,
}: Props) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [focusNome, setFocusNome] = useState<string | null>(null);

  const { data: report, isLoading, isError } = useComparisonReport(operationId, {
    polling: busy || scanning,
  });

  const content = report ? parseComparativoContent(report.content) : null;
  const isBusy = busy || scanning;

  const focusConcorrente = useMemo(() => {
    if (!content?.por_concorrente.length) return null;
    const nome = focusNome ?? content.por_concorrente[0]?.nome;
    return content.por_concorrente.find((c) => c.nome === nome) ?? content.por_concorrente[0];
  }, [content, focusNome]);

  async function handleGenerate() {
    if (competitorCount === 0) {
      alert("Mapeie concorrentes na aba Concorrência antes de gerar a análise.");
      return;
    }

    setScanning(true);
    const { error } = await supabase
      .from("operations")
      .update({
        job_mode: "comparativo",
        status: "queued",
        error: null,
        finished_at: null,
      })
      .eq("id", operationId);

    setScanning(false);

    if (error) {
      alert(`Erro: ${error.message}`);
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    void queryClient.invalidateQueries({ queryKey: ["comparison_report", operationId] });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="hera-card p-8 text-center text-sm text-destructive">
        Análise indisponível — confira a migration{" "}
        <code className="text-xs">20260608180000_comparison_reports.sql</code>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero — decisão, não planilha */}
      <div className="hera-card p-6 lg:p-8 border-primary/25 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="hera-label">Cockpit de decisão</p>
            <h1 className="font-serif text-2xl lg:text-3xl font-semibold text-foreground leading-tight">
              {content
                ? `Como ${empresaNome} se posiciona frente ao mercado`
                : `Análise comparativa: ${empresaNome}`}
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
              {content
                ? "Síntese estratégica pronta para reunião comercial e posicionamento."
                : `${competitorCount} concorrente(s) mapeados no banco. Gere a análise para transformar dados brutos em decisões — onde ganhar, o que evitar e como responder.`}
            </p>
            {report?.generated_at && (
              <p className="text-xs text-muted-foreground">
                Última análise: {new Date(report.generated_at).toLocaleString("pt-BR")} · Claude
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isBusy || competitorCount === 0}
            className="hera-btn-primary shrink-0"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {content ? "Atualizar análise" : "Gerar análise comparativa"}
          </button>
        </div>

        {isBusy && (
          <div className="mt-6 flex items-center gap-3 text-sm text-foreground border-t border-border/50 pt-6">
            <Loader2 className="h-5 w-5 text-hera-running animate-spin shrink-0" />
            Claude está cruzando {empresaNome} com {competitorCount} concorrentes — 2–5 min.
          </div>
        )}
      </div>

      {!content && !isBusy && (
        <div className="grid sm:grid-cols-3 gap-4">
          <EmptyHint
            icon={Target}
            title="O que você recebe"
            text="Resumo executivo, recomendações priorizadas e ângulos de ataque por concorrente."
          />
          <EmptyHint
            icon={Shield}
            title="Dados no backend"
            text="Ticket, oferta e posicionamento ficam em Concorrência. Aqui só entra o que importa para decidir."
          />
          <EmptyHint
            icon={TrendingUp}
            title="Próximo passo"
            text="Mapeie concorrentes → clique em Gerar análise → use as recomendações na call de vendas."
          />
        </div>
      )}

      {content && (
        <>
          {/* Resumo — legível */}
          <section className="hera-card p-6 lg:p-8">
            <p className="hera-label mb-3">Resumo executivo</p>
            <p className="text-base lg:text-lg text-foreground leading-relaxed">
              {content.resumo_executivo}
            </p>
          </section>

          {/* Recomendações primeiro — coração da decisão */}
          {content.recomendacoes.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                O que fazer agora
              </h2>
              <div className="grid gap-4">
                {[...content.recomendacoes]
                  .sort((a, b) => a.prioridade - b.prioridade)
                  .slice(0, 5)
                  .map((r, i) => (
                    <div
                      key={i}
                      className="hera-card p-5 lg:p-6 flex gap-4 border-l-4 border-l-primary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-serif text-lg font-semibold">
                        {r.prioridade}
                      </span>
                      <div>
                        <p className="text-base font-semibold text-foreground">{r.acao}</p>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {r.justificativa}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Radar — 3 colunas grandes */}
          <section className="grid lg:grid-cols-3 gap-4">
            <InsightColumn
              title="Onde ganhamos"
              icon={TrendingUp}
              items={content.vantagens_operador}
              tone="done"
            />
            <InsightColumn
              title="Oportunidades"
              icon={Target}
              items={content.gaps_mercado}
              tone="primary"
            />
            <InsightColumn
              title="Atenção"
              icon={AlertTriangle}
              items={content.riscos}
              tone="warn"
            />
          </section>

          {/* Um concorrente por vez — legível */}
          {content.por_concorrente.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-xl font-semibold text-foreground">
                Foco por concorrente
              </h2>
              <p className="text-sm text-muted-foreground">
                Selecione uma agência para ver como {empresaNome} deve se posicionar contra ela.
              </p>
              <div className="flex flex-wrap gap-2">
                {content.por_concorrente.map((c) => (
                  <button
                    key={c.nome}
                    type="button"
                    onClick={() => setFocusNome(c.nome)}
                    className={[
                      "text-sm px-4 py-2 rounded-full border transition-colors",
                      focusConcorrente?.nome === c.nome
                        ? "border-primary bg-primary/15 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
              {focusConcorrente && <ConcorrenteFocusCard c={focusConcorrente} empresa={empresaNome} />}
            </section>
          )}

          {/* Battle cards — accordion style */}
          {content.battle_cards.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-serif text-xl font-semibold text-foreground">
                Battle cards — objeções na call
              </h2>
              <div className="space-y-3">
                {content.battle_cards.map((b, i) => (
                  <details key={i} className="hera-card group">
                    <summary className="p-5 cursor-pointer list-none flex items-center justify-between gap-3">
                      <span className="text-base font-medium text-foreground">
                        vs {b.concorrente}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-5 pb-5 pt-0 grid sm:grid-cols-2 gap-4 border-t border-border/50 mt-0 pt-4 mx-5">
                      <div>
                        <p className="hera-label mb-2">O prospect diz</p>
                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                          &ldquo;{b.objecao}&rdquo;
                        </p>
                      </div>
                      <div>
                        <p className="hera-label mb-2">Você responde</p>
                        <p className="text-sm text-foreground leading-relaxed">{b.resposta}</p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ConcorrenteFocusCard({ c, empresa }: { c: ConcorrenteAnalise; empresa: string }) {
  return (
    <div className="hera-card p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl font-semibold text-foreground">{c.nome}</h3>
        <AmeacaBadge nivel={c.nivel_ameaca} />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <FocusBlock title="Onde eles ganham" text={c.onde_ganham} />
        <FocusBlock title="Onde eles perdem" text={c.onde_perdem} />
        <FocusBlock
          title={`Como ${empresa} ataca`}
          text={c.angulo_contra}
          highlight
        />
      </div>
    </div>
  );
}

function FocusBlock({
  title,
  text,
  highlight,
}: {
  title: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="hera-label mb-2">{title}</p>
      <p
        className={[
          "text-sm leading-relaxed",
          highlight ? "text-primary font-medium" : "text-foreground",
        ].join(" ")}
      >
        {text}
      </p>
    </div>
  );
}

function AmeacaBadge({ nivel }: { nivel: ConcorrenteAnalise["nivel_ameaca"] }) {
  const styles =
    nivel === "alta"
      ? "border-destructive/50 text-destructive bg-destructive/10"
      : nivel === "media"
        ? "border-hera-running/50 text-hera-running bg-hera-running/10"
        : "border-border text-muted-foreground";

  return (
    <span className={["text-sm px-3 py-1 rounded-full border font-medium", styles].join(" ")}>
      Ameaça {ameacaLabel(nivel)}
    </span>
  );
}

function InsightColumn({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  tone: "done" | "primary" | "warn";
}) {
  const border =
    tone === "done"
      ? "border-hera-done/30"
      : tone === "warn"
        ? "border-destructive/25"
        : "border-primary/25";

  return (
    <div className={["hera-card p-5 lg:p-6", border].join(" ")}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-foreground leading-relaxed flex gap-2">
              <span className="text-primary shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyHint({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="hera-card p-5 space-y-2">
      <Icon className="h-5 w-5 text-primary" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
