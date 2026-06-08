import { useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type ComercialData } from "@/lib/blueprint-types";

// ── helpers ───────────────────────────────────────────────────────────────

function toStrings(val: unknown): string[] {
  if (Array.isArray(val)) return asStrings(val);
  if (typeof val === "string") return [val];
  return [];
}

type FunilStep = { etapa: string; detalhe: string };

function parseFunilStep(item: unknown, i: number): FunilStep {
  if (typeof item === "string") {
    const parts = item.split(" — ");
    return { etapa: parts[0]?.trim() ?? item, detalhe: parts.slice(1).join(" — ").trim() };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    return {
      etapa: asString(obj.etapa ?? obj.nome ?? `Etapa ${i + 1}`),
      detalhe: asString(obj.responsavel ?? obj.descricao ?? obj.sla ?? ""),
    };
  }
  return { etapa: `Etapa ${i + 1}`, detalhe: String(item) };
}

type SpinCategory = "situacao" | "problema" | "implicacao" | "necessidade" | "fechamento" | "other";

function detectSpinCategory(q: string): SpinCategory {
  const lower = q.toLowerCase();
  if (lower.startsWith("situação:") || lower.startsWith("situacao:")) return "situacao";
  if (lower.startsWith("problema:")) return "problema";
  if (lower.startsWith("implicação:") || lower.startsWith("implicacao:")) return "implicacao";
  if (lower.startsWith("necessidade:")) return "necessidade";
  if (lower.startsWith("fechamento:")) return "fechamento";
  return "other";
}

function cleanQuestionText(q: string): string {
  return q.replace(/^(situação|situacao|problema|implicação|implicacao|necessidade|fechamento):\s*/i, "").trim();
}

// ── sub-components ────────────────────────────────────────────────────────

function StepCard({ number, text }: { number: number; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="hera-card w-full text-left px-4 py-3 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="hera-mono text-xs font-bold text-primary shrink-0 mt-0.5 w-6 text-right">
          {String(number).padStart(2, "0")}
        </span>
        <p
          className={[
            "text-sm text-foreground leading-relaxed flex-1 text-left",
            !open ? "line-clamp-2" : "",
          ].join(" ")}
        >
          {text}
        </p>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
    </button>
  );
}

const SPIN_CONFIG: Record<
  SpinCategory,
  { label: string; color: string; border: string; bg: string }
> = {
  situacao:    { label: "S — SITUAÇÃO",    color: "text-blue-400",  border: "border-blue-500/30",  bg: "bg-blue-500/5"  },
  problema:    { label: "P — PROBLEMA",    color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  implicacao:  { label: "I — IMPLICAÇÃO",  color: "text-red-400",   border: "border-red-500/30",   bg: "bg-red-500/5"   },
  necessidade: { label: "N — NECESSIDADE", color: "text-teal-400",  border: "border-teal-500/30",  bg: "bg-teal-500/5"  },
  fechamento:  { label: "FECHAMENTO",      color: "text-primary",   border: "border-primary/30",   bg: "bg-primary/5"   },
  other:       { label: "PERGUNTAS",       color: "text-foreground",border: "border-border",        bg: ""               },
};

function QuestionGroup({
  category,
  questions,
}: {
  category: SpinCategory;
  questions: string[];
}) {
  const cfg = SPIN_CONFIG[category];
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${cfg.border} ${cfg.bg}`}>
      <p className={`hera-mono text-[10px] font-bold uppercase tracking-wider mb-3 ${cfg.color}`}>
        {cfg.label}
      </p>
      {questions.map((q, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className={`hera-mono text-[10px] font-semibold shrink-0 mt-0.5 ${cfg.color}`}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-sm text-foreground/90 leading-relaxed italic">
            &ldquo;{cleanQuestionText(q)}&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hera-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────

export function ComercialSection({ data }: { data: Json }) {
  const d = (data ?? {}) as ComercialData;
  const funilSteps: FunilStep[] = Array.isArray(d.funil_comercial)
    ? d.funil_comercial.map(parseFunilStep)
    : [];
  const sdrCriterios = toStrings(d.sdr?.criterios);
  const sdrScripts = toStrings(d.sdr?.scripts);
  const closerRoteiro = toStrings(d.closer?.roteiro_call);
  const closerPerguntas = toStrings(d.closer?.perguntas);

  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const questionsByCategory = closerPerguntas.reduce<Record<SpinCategory, string[]>>(
    (acc, q) => {
      acc[detectSpinCategory(q)].push(q);
      return acc;
    },
    { situacao: [], problema: [], implicacao: [], necessidade: [], fechamento: [], other: [] },
  );
  const hasGroupedQuestions = Object.values(questionsByCategory).some((a) => a.length > 0);

  return (
    <div className="space-y-8 pt-2">

      {/* 1 — Funil pipeline */}
      {funilSteps.length > 0 && (
        <div>
          <p className="hera-label mb-4">Funil Comercial</p>

          {/* Horizontal kanban pipeline */}
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex items-stretch gap-0 min-w-max">
              {funilSteps.map((step, i) => {
                const isActive = selectedStage === i;
                return (
                  <div key={i} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedStage(isActive ? null : i)}
                      className={[
                        "flex flex-col items-start gap-1.5 px-3 py-3 rounded-lg border text-left transition-all min-w-[110px] max-w-[150px]",
                        isActive
                          ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(191,155,77,0.15)]"
                          : "hera-card hover:border-primary/30",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          isActive
                            ? "bg-primary text-hera-navy-deep"
                            : "bg-primary/20 text-primary",
                        ].join(" ")}
                      >
                        {i + 1}
                      </span>
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {step.etapa}
                      </p>
                      {step.detalhe && (
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                          {step.detalhe}
                        </span>
                      )}
                      <ChevronDown
                        className={`h-3 w-3 text-primary/60 transition-transform mt-auto self-end ${isActive ? "rotate-180" : ""}`}
                      />
                    </button>
                    {i < funilSteps.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage detail drawer */}
          {selectedStage !== null && funilSteps[selectedStage] && (
            <div className="mt-3 hera-card px-5 py-4 border-primary/20">
              <p className="hera-mono text-[11px] text-primary/70 font-semibold uppercase tracking-wider mb-1">
                Etapa {selectedStage + 1}
              </p>
              <h3 className="text-base font-bold text-foreground">
                {funilSteps[selectedStage].etapa}
              </h3>
              {funilSteps[selectedStage].detalhe && (
                <p className="text-sm text-muted-foreground mt-1">
                  Responsável:{" "}
                  <span className="font-medium text-foreground/80">
                    {funilSteps[selectedStage].detalhe}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2 — SDR */}
      {(sdrCriterios.length > 0 || sdrScripts.length > 0) && (
        <div>
          <p className="hera-label mb-3">SDR — Qualificação de Leads</p>

          {sdrCriterios.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {sdrCriterios.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 hera-card px-3 py-2.5">
                  <span className="h-4 w-4 rounded-full bg-hera-done/20 border border-hera-done/50 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-hera-done" />
                  </span>
                  <p className="text-sm text-foreground leading-snug">{c}</p>
                </div>
              ))}
            </div>
          )}

          {sdrScripts.map((script, i) => (
            <Accordion key={i} title={`Script SDR${sdrScripts.length > 1 ? ` ${i + 1}` : ""}`}>
              {script}
            </Accordion>
          ))}
        </div>
      )}

      {/* 3 — Closer */}
      {(closerRoteiro.length > 0 || hasGroupedQuestions) && (
        <div>
          <p className="hera-label mb-3">Closer — Roteiro de Call</p>

          {closerRoteiro.length > 0 && (
            <div className="space-y-2 mb-6">
              {closerRoteiro.map((etapa, i) => (
                <StepCard key={i} number={i + 1} text={etapa} />
              ))}
            </div>
          )}

          {hasGroupedQuestions && (
            <>
              <p className="hera-label mb-3 mt-4">Perguntas-chave na Call</p>
              <div className="space-y-3">
                {(
                  [
                    "situacao",
                    "problema",
                    "implicacao",
                    "necessidade",
                    "fechamento",
                    "other",
                  ] as SpinCategory[]
                ).map((cat) => {
                  const qs = questionsByCategory[cat];
                  if (!qs.length) return null;
                  return <QuestionGroup key={cat} category={cat} questions={qs} />;
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4 — Carta de Vendas */}
      {d.carta_vendas && (
        <Accordion title="Carta de Vendas">{asString(d.carta_vendas)}</Accordion>
      )}

      {/* 5 — Pitch Stacking */}
      {d.pitch_stacking && (
        <Accordion title="Value Stacking — Pitch de Fechamento">
          {asString(d.pitch_stacking)}
        </Accordion>
      )}
    </div>
  );
}
