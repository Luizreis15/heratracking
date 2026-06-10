import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { Json } from "@/types/index";

type SpinGuide = {
  situacao: string[];
  problema: string[];
  implicacao: string[];
  necessidade: string[];
};

const QUADRANTS = [
  {
    key: "situacao" as const,
    label: "S — SITUAÇÃO",
    subtitle: "Entenda o contexto do lead",
    borderClass: "border-blue-500/40",
    bgClass: "bg-blue-500/5",
    headingClass: "text-blue-400",
  },
  {
    key: "problema" as const,
    label: "P — PROBLEMA",
    subtitle: "Exponha a dor real",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/5",
    headingClass: "text-amber-400",
  },
  {
    key: "implicacao" as const,
    label: "I — IMPLICAÇÃO",
    subtitle: "Amplie a urgência",
    borderClass: "border-red-500/40",
    bgClass: "bg-red-500/5",
    headingClass: "text-red-400",
  },
  {
    key: "necessidade" as const,
    label: "N — NECESSIDADE",
    subtitle: "Antecipe a solução",
    borderClass: "border-teal-500/40",
    bgClass: "bg-teal-500/5",
    headingClass: "text-teal-400",
  },
] as const;

function parseSpinGuide(raw: Json): SpinGuide | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (
    !Array.isArray(obj.situacao) ||
    !Array.isArray(obj.problema) ||
    !Array.isArray(obj.implicacao) ||
    !Array.isArray(obj.necessidade)
  ) {
    return null;
  }
  return {
    situacao: (obj.situacao as unknown[]).filter((s): s is string => typeof s === "string"),
    problema: (obj.problema as unknown[]).filter((s): s is string => typeof s === "string"),
    implicacao: (obj.implicacao as unknown[]).filter((s): s is string => typeof s === "string"),
    necessidade: (obj.necessidade as unknown[]).filter((s): s is string => typeof s === "string"),
  };
}

type SpinPanelProps = {
  spinGuide: Json | null;
  onRefineSpin?: (instruction: string) => Promise<void>;
  isRefining?: boolean;
};

export function SpinPanel({ spinGuide, onRefineSpin, isRefining = false }: SpinPanelProps) {
  const spin = spinGuide ? parseSpinGuide(spinGuide) : null;
  const [aiOpen, setAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasContent =
    spin &&
    (spin.situacao.length > 0 ||
      spin.problema.length > 0 ||
      spin.implicacao.length > 0 ||
      spin.necessidade.length > 0);

  async function handleRefine() {
    if (!instruction.trim() || !onRefineSpin) return;
    setSubmitting(true);
    try {
      await onRefineSpin(instruction.trim());
      setAiOpen(false);
      setInstruction("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 pt-6 mt-6 border-t border-border/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="hera-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            SPIN Selling Guide
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Perguntas de descoberta para calls — refinável separadamente do processo comercial.
          </p>
        </div>
        {onRefineSpin && (
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            disabled={isRefining}
            className="hera-btn-ghost border border-border text-xs shrink-0"
          >
            {isRefining ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {hasContent ? "Ajustar SPIN" : "Gerar SPIN"}
          </button>
        )}
      </div>

      {aiOpen && onRefineSpin && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-xs font-semibold text-primary">Refinamento — SPIN Selling</p>
            <button type="button" onClick={() => setAiOpen(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <textarea
            rows={2}
            autoFocus
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={
              hasContent
                ? 'Ex.: "Perguntas mais técnicas para CTO de indústria — foco em homologação e rastreabilidade"'
                : 'Ex.: "Gerar guia SPIN completo para SaaS B2B de homologação de fornecedores"'
            }
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground
                       focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
          />
          <div className="flex justify-end mt-2.5">
            <button
              type="button"
              onClick={() => void handleRefine()}
              disabled={!instruction.trim() || submitting}
              className="hera-btn-primary text-xs py-1.5 px-3"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {hasContent ? "Refinar SPIN" : "Gerar SPIN"}
            </button>
          </div>
        </div>
      )}

      {isRefining && !aiOpen && (
        <div className="flex items-center gap-2 text-sm text-hera-cyan">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando guia SPIN...
        </div>
      )}

      {!hasContent && !isRefining && (
        <div className="hera-card p-6 text-center border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            Nenhum guia SPIN gravado ainda. Use &quot;Gerar SPIN&quot; ou ajuste a seção comercial com IA
            (o SPIN é atualizado junto).
          </p>
        </div>
      )}

      {hasContent && spin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUADRANTS.map((q) => {
            const questions = spin[q.key];
            if (!questions.length) return null;
            return (
              <div
                key={q.key}
                className={["hera-card p-4 border", q.borderClass, q.bgClass].join(" ")}
              >
                <div className="mb-3">
                  <p
                    className={`hera-mono text-xs font-bold uppercase tracking-wider ${q.headingClass}`}
                  >
                    {q.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{q.subtitle}</p>
                </div>
                <ol className="space-y-2">
                  {questions.map((q_, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className={`hera-mono text-[10px] font-semibold shrink-0 mt-0.5 ${q.headingClass}`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-xs text-foreground/90 leading-relaxed">{q_}</p>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
