import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Building2, Check, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AnaliseDecisaoPanel } from "@/components/operation/AnaliseDecisaoPanel";
import { useOperationOperador } from "@/hooks/useOperationOperador";
import {
  parseOperadorFromOperation,
  profileFromOperation,
  type OperadorProfile,
} from "@/lib/operador-profile";
import { toastError } from "@/lib/toast";
import type { OperationContext } from "./operation-context";

export function HeraDgView() {
  const { operation, competitors, operationId } = useOutletContext<OperationContext>();
  const comparativoBusy =
    (operation.status === "queued" || operation.status === "running") &&
    operation.job_mode === "comparativo";
  const { workspace } = useAuth();
  const empresaFallback = workspace?.name?.trim() || "Minha empresa";

  const { saveOperador, isSaving, saveError } = useOperationOperador(
    operation,
    empresaFallback,
  );

  const [form, setForm] = useState<OperadorProfile>(() =>
    parseOperadorFromOperation(operation, empresaFallback),
  );
  const [saved, setSaved] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${operationId}:${operation.operador_perfil ? "saved" : "new"}`;
    if (loadedForRef.current === key) return;
    loadedForRef.current = key;
    setForm(parseOperadorFromOperation(operation, empresaFallback));
  }, [operationId, operation.operador_perfil, operation, empresaFallback]);

  function update<K extends keyof OperadorProfile>(key: K, value: OperadorProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    try {
      await saveOperador(form);
      loadedForRef.current = `${operationId}:saved`;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    }
  }

  const displayName = form.nome.trim() || empresaFallback;

  return (
    <div className="space-y-10 max-w-4xl">
      <AnaliseDecisaoPanel
        operationId={operationId}
        empresaNome={displayName}
        competitorCount={competitors.length}
        busy={comparativoBusy}
      />

      {competitors.length === 0 && (
        <div className="hera-card p-5 text-sm text-muted-foreground">
          Nenhum concorrente mapeado.{" "}
          <Link to={`/operations/${operationId}/concorrencia`} className="text-primary hover:underline">
            Ir para Concorrência →
          </Link>
        </div>
      )}

      {/* Perfil — secundário, colapsado */}
      <section className="border border-border/60 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setPerfilOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Perfil de {displayName}
            </span>
            <span className="text-xs text-muted-foreground">— dados de entrada da análise</span>
          </div>
          <ChevronDown
            className={["h-4 w-4 text-muted-foreground transition-transform", perfilOpen && "rotate-180"].join(" ")}
          />
        </button>

        {perfilOpen && (
          <div className="px-5 pb-5 pt-2 space-y-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Estes campos alimentam a análise comparativa. Os dados dos concorrentes ficam em{" "}
              <Link to={`/operations/${operationId}/concorrencia`} className="text-primary hover:underline">
                Concorrência
              </Link>
              .
            </p>

            {saveError && (
              <p className="text-sm text-destructive">
                {saveError instanceof Error ? saveError.message : "Erro ao salvar."}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    ...profileFromOperation(operation, prev.nome || empresaFallback),
                  }));
                  setSaved(false);
                }}
                className="hera-btn-ghost text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Importar do briefing
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="hera-btn-primary text-xs"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
                {saved ? "Salvo" : "Salvar perfil"}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome da empresa">
                <input
                  className={inputCls}
                  value={form.nome}
                  placeholder="Ex.: Minha empresa"
                  onChange={(e) => update("nome", e.target.value)}
                />
              </Field>
              <Field label="Ticket (retainer)">
                <input
                  className={inputCls}
                  value={form.ticket ?? ""}
                  onChange={(e) => update("ticket", e.target.value)}
                />
              </Field>
              <Field label="Site">
                <input
                  className={inputCls}
                  value={form.url ?? ""}
                  onChange={(e) => update("url", e.target.value)}
                />
              </Field>
              <Field label="Instagram">
                <input
                  className={inputCls}
                  value={form.instagram ?? ""}
                  onChange={(e) => update("instagram", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Posicionamento">
              <textarea
                rows={2}
                className={inputCls}
                value={form.posicionamento ?? ""}
                onChange={(e) => update("posicionamento", e.target.value)}
              />
            </Field>
            <Field label="Oferta">
              <textarea
                rows={2}
                className={inputCls}
                value={form.oferta ?? ""}
                onChange={(e) => update("oferta", e.target.value)}
              />
            </Field>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="hera-label">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
