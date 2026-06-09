import { useState } from "react";
import { NavLink, useOutletContext, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import { SECTION_DEFS, type BlueprintLayoutContext } from "./BlueprintView";
import type { Json } from "@/types/index";

export function BlueprintSectionPage() {
  const { sectionKey } = useParams<{ sectionKey: string }>();
  const {
    operation,
    sections,
    operationId,
    makeRefineHandler,
    isAnyRefining,
    refiningSection,
    refineErrored,
    spinGuide,
    filledSections,
  } = useOutletContext<BlueprintLayoutContext>();

  const defIndex = SECTION_DEFS.findIndex((s) => s.key === sectionKey);
  const def = defIndex >= 0 ? SECTION_DEFS[defIndex] : null;
  const data = sectionKey ? (sections[sectionKey] as Json | undefined) : undefined;

  const [aiOpen, setAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!def || data == null) {
    return (
      <div className="hera-card p-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {data == null ? "Esta seção ainda não foi gerada." : "Seção não encontrada."}
        </p>
      </div>
    );
  }

  const isSectionRefining = refiningSection === sectionKey && isAnyRefining;

  const filledKeys = filledSections.map((s) => s.key);
  const currentFilledIdx = filledKeys.indexOf(sectionKey!);
  const prevKey = currentFilledIdx > 0 ? filledKeys[currentFilledIdx - 1] : null;
  const nextKey = currentFilledIdx >= 0 && currentFilledIdx < filledKeys.length - 1
    ? filledKeys[currentFilledIdx + 1]
    : null;
  const prevDef = prevKey ? SECTION_DEFS.find((s) => s.key === prevKey) : null;
  const nextDef = nextKey ? SECTION_DEFS.find((s) => s.key === nextKey) : null;

  async function handleRefine() {
    if (!instruction.trim()) return;
    setSubmitting(true);
    try {
      await makeRefineHandler(def!.key)(instruction.trim());
      setAiOpen(false);
      setInstruction("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 hera-reveal-up">
      {/* Section header */}
      <div className="hera-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="hera-label mb-1">
              <span className="hera-mono">{String(defIndex + 1).padStart(2, "0")}</span>
              {" · "}Seção
            </p>
            <h2 className="font-sans text-2xl font-bold text-foreground tracking-tight">
              {def.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            disabled={isSectionRefining}
            className="hera-btn-primary text-xs shrink-0"
          >
            {isSectionRefining ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Ajustar com IA
          </button>
        </div>

        {/* Inline refine panel */}
        {aiOpen && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-xs font-semibold text-primary">
                Refinamento — {def.label}
              </p>
              <button type="button" onClick={() => setAiOpen(false)}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Descreva o que deve mudar. O worker regenera apenas esta seção, mantendo o restante.
            </p>
            <textarea
              rows={2}
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='Ex.: "Remover menção a restauração — foco apenas em implante e reabilitação multifuncional"'
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground
                         focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
            />
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-[10px] text-muted-foreground">
                O worker regenera apenas esta seção.
              </p>
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
                Regenerar seção
              </button>
            </div>
          </div>
        )}

        {isSectionRefining && !aiOpen && (
          <div className="mt-3 flex items-center gap-2 text-sm text-hera-cyan">
            <Loader2 className="h-4 w-4 animate-spin" />
            Regenerando — aguarde...
          </div>
        )}
        {refineErrored && refiningSection === null && !isSectionRefining && (
          <div className="mt-3 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
            <p className="text-xs font-semibold text-destructive mb-0.5">Refinamento falhou</p>
            <p className="text-[11px] text-destructive/80 font-mono break-all">
              {operation.error ?? "Erro desconhecido — veja logs do worker"}
            </p>
          </div>
        )}
      </div>

      {/* Section content — always visible, no accordion */}
      <div className="hera-card px-6 pb-10 pt-6 hera-prose">
        {def.render(
          data,
          operationId,
          def.key === "comercial" ? spinGuide : undefined,
        )}
      </div>

      {/* Prev / Next navigation */}
      {(prevDef || nextDef) && (
        <div className="flex items-center justify-between gap-4 pt-2">
          {prevDef ? (
            <NavLink
              to={`/operations/${operationId}/blueprint/${prevDef.key}`}
              className="hera-btn-ghost border border-border flex items-center gap-2 text-sm"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[180px]">{prevDef.label}</span>
            </NavLink>
          ) : (
            <div />
          )}
          {nextDef && (
            <NavLink
              to={`/operations/${operationId}/blueprint/${nextDef.key}`}
              className="hera-btn-ghost border border-border flex items-center gap-2 text-sm ml-auto"
            >
              <span className="truncate max-w-[180px]">{nextDef.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </NavLink>
          )}
        </div>
      )}
    </div>
  );
}
