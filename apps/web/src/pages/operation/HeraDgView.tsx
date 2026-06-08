import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Building2, Check, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMethodProfile } from "@/hooks/useMethodProfile";
import { ComparativoStrategic } from "@/components/operation/ComparativoStrategic";
import { ComparisonMatrix } from "@/components/operation/ComparisonMatrix";
import { ComparisonTable } from "@/components/operation/ComparisonTable";
import {
  profileFromOperation,
  type OperadorProfile,
} from "@/lib/operador-profile";
import type { OperationContext } from "./operation-context";

export function HeraDgView() {
  const { operation, competitors, operationId } = useOutletContext<OperationContext>();
  const comparativoBusy =
    operation.status === "queued" ||
    operation.status === "running" ||
    operation.job_mode === "comparativo";
  const { workspace } = useAuth();
  const { operador, saveOperador, isSaving, isLoading, saveError } = useMethodProfile(
    workspace?.id,
  );

  const [form, setForm] = useState<OperadorProfile>(operador);
  const [saved, setSaved] = useState(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(
    competitors[0]?.id ?? null,
  );

  useEffect(() => {
    setForm(operador);
  }, [operador]);

  useEffect(() => {
    if (competitors.length > 0 && !selectedCompetitorId) {
      setSelectedCompetitorId(competitors[0].id);
    }
  }, [competitors, selectedCompetitorId]);

  function update<K extends keyof OperadorProfile>(key: K, value: OperadorProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    try {
      await saveOperador(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao salvar perfil da agência.";
      alert(msg);
    }
  }

  function importFromBriefing() {
    setForm((prev) => ({ ...prev, ...profileFromOperation(operation) }));
    setSaved(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hera-label mb-1">Perfil interno</p>
          <h1 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Hera DG
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Como a agência se posiciona — base para comparar com concorrentes nesta operação.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={importFromBriefing} className="hera-btn-ghost text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Importar do briefing
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="hera-btn-primary"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? "Salvo" : "Salvar perfil"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="hera-card border-destructive/40 px-4 py-3 text-sm text-destructive max-w-5xl">
          {saveError instanceof Error ? saveError.message : "Erro ao salvar perfil."}
        </div>
      )}

      {!workspace && (
        <div className="hera-card border-hera-running/30 px-4 py-3 text-sm text-muted-foreground max-w-5xl">
          Workspace ainda não carregou — aguarde o bootstrap ou faça login novamente.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
        <ProfileForm form={form} onChange={update} />
        <PreviewCard profile={form} />
      </div>

      <div className="space-y-6">
        <div>
          <p className="hera-label mb-1">Comparativo</p>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Matriz — Nós vs Todas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Hera DG fixa à esquerda; todas as agências concorrentes em colunas. Oculte colunas ou
            clique no nome para ver o detalhe 1:1.
          </p>
        </div>
        <ComparisonMatrix
          operador={form}
          competitors={competitors}
          onFocusCompetitor={(id) => {
            setSelectedCompetitorId(id);
            document.getElementById("comparison-focus")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      <ComparativoStrategic
        operationId={operationId}
        competitorCount={competitors.length}
        busy={comparativoBusy}
      />

      <div id="comparison-focus" className="space-y-4 max-w-4xl">
        <div>
          <p className="hera-label mb-1">Detalhe</p>
          <h2 className="font-serif text-lg font-semibold text-foreground">Foco em uma agência</h2>
        </div>
        <ComparisonTable
          operador={form}
          competitors={competitors}
          selectedId={selectedCompetitorId}
          onSelect={setSelectedCompetitorId}
        />
      </div>
    </div>
  );
}

function ProfileForm({
  form,
  onChange,
}: {
  form: OperadorProfile;
  onChange: <K extends keyof OperadorProfile>(key: K, value: OperadorProfile[K]) => void;
}) {
  return (
    <div className="hera-card p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">Editar perfil</p>

      <Field label="Nome da agência">
        <input
          className={inputCls}
          value={form.nome}
          onChange={(e) => onChange("nome", e.target.value)}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Site">
          <input
            className={inputCls}
            placeholder="https://..."
            value={form.url ?? ""}
            onChange={(e) => onChange("url", e.target.value)}
          />
        </Field>
        <Field label="Instagram">
          <input
            className={inputCls}
            placeholder="instagram.com/heradg"
            value={form.instagram ?? ""}
            onChange={(e) => onChange("instagram", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Ticket (retainer)">
        <input
          className={inputCls}
          value={form.ticket ?? ""}
          onChange={(e) => onChange("ticket", e.target.value)}
        />
      </Field>

      <Field label="Modelo de entrega">
        <input
          className={inputCls}
          value={form.modelo_entrega ?? ""}
          onChange={(e) => onChange("modelo_entrega", e.target.value)}
        />
      </Field>

      <Field label="Oferta">
        <textarea
          rows={2}
          className={inputCls}
          value={form.oferta ?? ""}
          onChange={(e) => onChange("oferta", e.target.value)}
        />
      </Field>

      <Field label="Posicionamento">
        <textarea
          rows={3}
          className={inputCls}
          value={form.posicionamento ?? ""}
          onChange={(e) => onChange("posicionamento", e.target.value)}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Pontos fortes">
          <textarea
            rows={3}
            className={inputCls}
            value={form.pontos_fortes ?? ""}
            onChange={(e) => onChange("pontos_fortes", e.target.value)}
          />
        </Field>
        <Field label="Pontos fracos">
          <textarea
            rows={3}
            className={inputCls}
            value={form.pontos_fracos ?? ""}
            onChange={(e) => onChange("pontos_fracos", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Ângulos criativos (um por linha)">
        <textarea
          rows={3}
          className={inputCls}
          value={(form.angulos_criativos ?? []).join("\n")}
          onChange={(e) =>
            onChange(
              "angulos_criativos",
              e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
            )
          }
        />
      </Field>
    </div>
  );
}

function PreviewCard({ profile }: { profile: OperadorProfile }) {
  return (
    <div className="hera-card p-5 border-primary/25 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="hera-label">Nós</p>
          <h3 className="font-serif text-xl font-semibold text-foreground mt-1">{profile.nome}</h3>
        </div>
        {profile.ticket && (
          <span className="text-xs text-primary font-medium text-right max-w-[40%] leading-snug">
            {profile.ticket}
          </span>
        )}
      </div>

      {profile.posicionamento && (
        <div>
          <p className="hera-label mb-1">Posicionamento</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{profile.posicionamento}</p>
        </div>
      )}

      {profile.oferta && (
        <div>
          <p className="hera-label mb-1">Oferta</p>
          <p className="text-xs text-muted-foreground">{profile.oferta}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {profile.pontos_fortes && (
          <div className="text-[10px] rounded-md bg-hera-done/10 border border-hera-done/20 px-2.5 py-2">
            <span className="font-semibold text-hera-done">+ </span>
            <span className="text-muted-foreground">{profile.pontos_fortes}</span>
          </div>
        )}
        {profile.pontos_fracos && (
          <div className="text-[10px] rounded-md bg-destructive/10 border border-destructive/20 px-2.5 py-2">
            <span className="font-semibold text-destructive">− </span>
            <span className="text-muted-foreground">{profile.pontos_fracos}</span>
          </div>
        )}
      </div>

      {profile.angulos_criativos && profile.angulos_criativos.length > 0 && (
        <div>
          <p className="hera-label mb-2">Ângulos criativos</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.angulos_criativos.map((a) => (
              <span
                key={a}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
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
