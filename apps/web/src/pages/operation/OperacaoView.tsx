import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart3, Check, Loader2, Minus, Plus } from "lucide-react";
import { useOperationMetrics } from "@/hooks/useOperationMetrics";
import {
  EMPTY_METRICS,
  METRIC_LABELS,
  fieldsFromMetric,
  formatPeriodLabel,
  metricToFields,
  type MetricFields,
  type NumericMetricKey,
} from "@/lib/operation-metrics";
import type { OperationContext } from "./operation-context";

export function OperacaoView() {
  const { operationId } = useOutletContext<OperationContext>();
  const {
    metrics,
    currentPeriod,
    isLoading,
    isError,
    saveMetrics,
    isSaving,
    increment,
    isIncrementing,
  } = useOperationMetrics(operationId);

  const [form, setForm] = useState<MetricFields>(EMPTY_METRICS);
  const [editPeriod, setEditPeriod] = useState(currentPeriod);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditPeriod(currentPeriod);
  }, [currentPeriod]);

  useEffect(() => {
    const row = metrics.find((m) => m.period_month === editPeriod);
    setForm(row ? fieldsFromMetric(row) : { ...EMPTY_METRICS });
  }, [metrics, editPeriod]);

  function update<K extends keyof MetricFields>(key: K, value: MetricFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function bumpNumber(key: NumericMetricKey, delta: number) {
    setForm((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
    setSaved(false);
  }

  async function handleSave() {
    await saveMetrics({ periodMonth: editPeriod, fields: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function quickAdd(field: NumericMetricKey) {
    if (editPeriod === currentPeriod) {
      await increment({ field, delta: 1 });
    } else {
      bumpNumber(field, 1);
      await saveMetrics({
        periodMonth: editPeriod,
        fields: { ...form, [field]: form[field] + 1 },
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="hera-card p-8 text-center max-w-md mx-auto">
        <p className="text-sm text-destructive">
          Tabela de métricas indisponível. Aplique a migration{" "}
          <code className="text-xs">20260608120000_operation_metrics.sql</code> no Supabase.
        </p>
      </div>
    );
  }

  const busy = isSaving || isIncrementing;
  const isCurrentMonth = editPeriod === currentPeriod;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="hera-label mb-1">Cockpit diário</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Operação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitore leads, conteúdos, reuniões e agendamentos da Hera DG neste nicho.
        </p>
      </div>

      {isCurrentMonth && (
        <div className="hera-card p-4 space-y-3 border-primary/20">
          <p className="text-sm font-semibold text-foreground">Registro rápido — hoje</p>
          <p className="text-xs text-muted-foreground">
            Um clique incrementa o contador do mês atual.
          </p>
          <div className="flex flex-wrap gap-2">
            {METRIC_LABELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => void quickAdd(key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                           border border-border bg-accent/40 hover:border-primary/40
                           disabled:opacity-50 transition-colors"
              >
                <Plus className="h-3 w-3 text-primary" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRIC_LABELS.map(({ key, label, short }) => (
          <div key={key} className="hera-card p-4 text-center">
            <p className="text-2xl font-serif font-semibold text-foreground">
              {form[key]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
              {short}
            </p>
            <p className="text-[9px] text-muted-foreground/70 mt-0.5 hidden sm:block">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="hera-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            Editar — {formatPeriodLabel(editPeriod)}
          </p>
          <select
            value={editPeriod}
            onChange={(e) => setEditPeriod(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-md border border-input bg-background"
          >
            <option value={currentPeriod}>{formatPeriodLabel(currentPeriod)} (atual)</option>
            {metrics
              .filter((m) => m.period_month !== currentPeriod)
              .map((m) => (
                <option key={m.id} value={m.period_month}>
                  {formatPeriodLabel(m.period_month)}
                </option>
              ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {METRIC_LABELS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="hera-label">{label}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bumpNumber(key, -1)}
                  className="p-2 rounded-md border border-border hover:bg-accent/60"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => update(key, Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() => bumpNumber(key, 1)}
                  className="p-2 rounded-md border border-border hover:bg-accent/60"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="hera-label">Notas do período</label>
          <textarea
            rows={3}
            value={form.notas}
            onChange={(e) => update("notas", e.target.value)}
            placeholder="Ex.: campanha de implante rodando, 2 calls de diagnóstico esta semana..."
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className="hera-btn-primary"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saved ? "Salvo" : "Salvar período"}
        </button>
      </div>

      {metrics.length > 0 && (
        <div className="space-y-3">
          <p className="hera-label">Histórico</p>
          <div className="hera-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-hera-surface/50">
                  <th className="text-left py-2.5 px-3 hera-label">Mês</th>
                  {METRIC_LABELS.map(({ short }) => (
                    <th key={short} className="text-center py-2.5 px-2 hera-label">
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const f = metricToFields(m);
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border/50 hover:bg-accent/30 cursor-pointer"
                      onClick={() => setEditPeriod(m.period_month)}
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {formatPeriodLabel(m.period_month)}
                      </td>
                      {METRIC_LABELS.map(({ key }) => (
                        <td key={key} className="text-center py-2.5 px-2 text-muted-foreground">
                          {f[key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
