import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, X } from "lucide-react";
import { regenerateOperation } from "@/lib/regenerate-operation";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  operationId: string;
  disabled?: boolean;
  className?: string;
};

export function RegenerateOperationButton({
  operationId,
  disabled = false,
  className = "",
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keepCompetitors, setKeepCompetitors] = useState(true);
  const [keepContent, setKeepContent] = useState(false);
  const [keepComparison, setKeepComparison] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    const { error } = await regenerateOperation(operationId, {
      keepCompetitors,
      keepContent,
      keepComparison,
    });
    setSubmitting(false);

    if (error) {
      toastError(error);
      return;
    }

    setOpen(false);
    toastSuccess("Nova geração enfileirada — acompanhe na Jornada");

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["operation", operationId] }),
      queryClient.invalidateQueries({ queryKey: ["phase_events", operationId] }),
      queryClient.invalidateQueries({ queryKey: ["blueprint", operationId] }),
      queryClient.invalidateQueries({ queryKey: ["competitors", operationId] }),
      queryClient.invalidateQueries({ queryKey: ["content_items", operationId] }),
      queryClient.invalidateQueries({ queryKey: ["comparison_report", operationId] }),
    ]);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || submitting}
        onClick={() => setOpen(true)}
        className={[
          "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
          "border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
          "disabled:opacity-50 disabled:pointer-events-none",
          className,
        ].join(" ")}
      >
        <RefreshCw className="h-4 w-4 shrink-0" />
        Regenerar operação
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-dialog-title"
        >
          <div className="hera-card w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="regenerate-dialog-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Regenerar operação
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Apaga o Blueprint atual e gera uma nova estrutura completa. O briefing
                  (nicho, posicionamento, ticket) é preservado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepCompetitors}
                  onChange={(e) => setKeepCompetitors(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">Manter mapa de concorrência</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Recomendado — economiza tempo de pesquisa
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepContent}
                  onChange={(e) => setKeepContent(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">Manter peças de conteúdo</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Posts, reels e emails já gerados na aba Conteúdo
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepComparison}
                  onChange={(e) => setKeepComparison(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">Manter análise comparativa</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Pode ficar desatualizada após nova geração
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setOpen(false)}
                className="hera-btn-ghost border border-border text-sm px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleConfirm()}
                className="hera-btn-primary text-sm px-4 py-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Confirmar regeneração
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
