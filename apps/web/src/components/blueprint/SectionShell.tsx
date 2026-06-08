import { useState, type ReactNode } from "react";
import { ChevronDown, Loader2, Sparkles, X } from "lucide-react";

type Props = {
  num: number;
  label: string;
  defaultOpen?: boolean;
  /** When true, content is always shown regardless of toggle state (used for print) */
  forceOpen?: boolean;
  children: ReactNode;
  /** E2: recebe instrução e submete job de refinamento */
  onRefine?: (instruction: string) => Promise<void>;
  isRefining?: boolean;
};

export function SectionShell({
  num,
  label,
  defaultOpen = false,
  forceOpen = false,
  children,
  onRefine,
  isRefining,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [aiOpen, setAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRefine() {
    if (!instruction.trim() || !onRefine) return;
    setSubmitting(true);
    try {
      await onRefine(instruction.trim());
      setAiOpen(false);
      setInstruction("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hera-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className="text-xs text-primary font-mono w-5 shrink-0">
            {String(num).padStart(2, "0")}
          </span>
          <span className="flex-1 text-sm font-semibold text-foreground truncate">{label}</span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => setAiOpen((o) => !o)}
          disabled={isRefining}
          title="Ajustar esta seção com IA"
          className="flex items-center gap-1.5 text-[11px] font-medium text-primary border border-primary/25 hover:bg-primary/10 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
        >
          {isRefining ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Ajustar
        </button>
      </div>

      {/* ── AI Refinement Panel ── */}
      {aiOpen && (
        <div className="mx-4 mb-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-xs font-semibold text-primary">Ajustar com IA — {label}</p>
            <button type="button" onClick={() => setAiOpen(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Descreva o que deve mudar. Ex.: "Remover menção a restauração e limpeza — foco
            apenas em implante e reabilitação multifuncional".
          </p>
          <textarea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Sua instrução de refinamento..."
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground
                       focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
          />
          <div className="flex items-center justify-between mt-2.5">
            <p className="text-[10px] text-muted-foreground">
              {onRefine ? "O worker regenera apenas esta seção." : "Disponível na próxima versão."}
            </p>
            <button
              type="button"
              onClick={() => void handleRefine()}
              disabled={!instruction.trim() || submitting || !onRefine}
              className="hera-btn-primary text-xs py-1.5 px-3"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {onRefine ? "Regenerar seção" : "Em breve"}
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {(open || forceOpen) && (
        <div className="px-5 pb-6 pt-2 border-t border-border/40">
          {children}
        </div>
      )}
    </div>
  );
}
