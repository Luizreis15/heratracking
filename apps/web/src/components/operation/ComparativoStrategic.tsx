import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Brain, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useComparisonReport } from "@/hooks/useComparisonReport";
import {
  ameacaLabel,
  parseComparativoContent,
} from "@/lib/comparativo-report";
import { supabase } from "@/lib/supabase";

type Props = {
  operationId: string;
  competitorCount: number;
  busy: boolean;
};

export function ComparativoStrategic({ operationId, competitorCount, busy }: Props) {
  const queryClient = useQueryClient();
  const isGenerating = busy;
  const { data: report, isLoading, isError } = useComparisonReport(operationId, {
    polling: isGenerating,
  });
  const [scanning, setScanning] = useState(false);

  const content = report ? parseComparativoContent(report.content) : null;

  async function handleGenerate() {
    if (competitorCount === 0) {
      alert("Mapeie concorrentes antes de gerar o comparativo estratégico.");
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

  const isBusy = isGenerating || scanning;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="hera-card p-6 text-center text-sm text-destructive">
        Relatório indisponível. Aplique a migration{" "}
        <code className="text-xs">20260608180000_comparison_reports.sql</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hera-label mb-1 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Análise estratégica
          </p>
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Comparativo inteligente
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Claude sintetiza perfil Hera DG + concorrentes + intel recente. Perplexity e Meta
            alimentam os dados; Claude interpreta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isBusy || competitorCount === 0}
          className="hera-btn-primary text-xs"
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {content ? "Regenerar análise" : "Gerar análise"}
        </button>
      </div>

      {isBusy && (
        <div className="hera-card px-4 py-3 flex items-center gap-3 border-hera-running/30">
          <Loader2 className="h-5 w-5 text-hera-running animate-spin shrink-0" />
          <p className="text-sm text-foreground">
            Claude analisando {competitorCount} concorrentes — 2–5 minutos.
          </p>
        </div>
      )}

      {!content && !isBusy && (
        <div className="hera-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            A matriz acima mostra fatos lado a lado. Gere a análise para ver gaps, battle cards e
            recomendações comerciais.
          </p>
        </div>
      )}

      {content && (
        <div className="space-y-4">
          <div className="hera-card p-5 border-primary/20">
            <p className="hera-label mb-2">Resumo executivo</p>
            <p className="text-sm text-foreground leading-relaxed">{content.resumo_executivo}</p>
            {report?.generated_at && (
              <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {new Date(report.generated_at).toLocaleString("pt-BR")} · Claude
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <ListCard title="Nossas vantagens" items={content.vantagens_operador} tone="done" />
            <ListCard title="Gaps de mercado" items={content.gaps_mercado} tone="primary" />
            <ListCard title="Riscos" items={content.riscos} tone="warn" />
          </div>

          {content.por_concorrente.length > 0 && (
            <div className="space-y-2">
              <p className="hera-label">Por concorrente</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {content.por_concorrente.map((c) => (
                  <div key={c.nome} className="hera-card p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                      <span
                        className={[
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          c.nivel_ameaca === "alta"
                            ? "border-destructive/40 text-destructive bg-destructive/10"
                            : c.nivel_ameaca === "media"
                              ? "border-hera-running/40 text-hera-running"
                              : "border-border text-muted-foreground",
                        ].join(" ")}
                      >
                        Ameaça {ameacaLabel(c.nivel_ameaca)}
                      </span>
                    </div>
                    <MiniBlock label="Onde ganham" text={c.onde_ganham} />
                    <MiniBlock label="Onde perdem" text={c.onde_perdem} />
                    <MiniBlock label="Ângulo contra" text={c.angulo_contra} highlight />
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.recomendacoes.length > 0 && (
            <div className="hera-card p-4">
              <p className="hera-label mb-3">Recomendações</p>
              <ol className="space-y-3">
                {[...content.recomendacoes]
                  .sort((a, b) => a.prioridade - b.prioridade)
                  .map((r, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-primary font-semibold mr-2">P{r.prioridade}</span>
                      <span className="font-medium text-foreground">{r.acao}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.justificativa}</p>
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {content.battle_cards.length > 0 && (
            <div className="space-y-2">
              <p className="hera-label">Battle cards</p>
              <div className="grid gap-2">
                {content.battle_cards.map((b, i) => (
                  <div key={i} className="hera-card p-4 grid sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Concorrente</p>
                      <p className="font-medium">{b.concorrente}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Objeção</p>
                      <p>{b.objecao}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Resposta</p>
                      <p className="text-foreground">{b.resposta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "done" | "primary" | "warn";
}) {
  const border =
    tone === "done"
      ? "border-hera-done/30"
      : tone === "warn"
        ? "border-destructive/20"
        : "border-primary/20";

  return (
    <div className={["hera-card p-4", border].join(" ")}>
      <p className="hera-label mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="text-xs text-foreground space-y-1.5 list-disc pl-4">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniBlock({
  label,
  text,
  highlight,
}: {
  label: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={["text-xs", highlight ? "text-primary" : "text-foreground"].join(" ")}>
        {text}
      </p>
    </div>
  );
}
