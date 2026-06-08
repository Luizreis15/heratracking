import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart3, Check, Loader2, Minus, Plus, TrendingUp, TrendingDown } from "lucide-react";
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
import type { OperationMetric } from "@/types/index";
import type { OperationContext } from "./operation-context";

// ─── SparkLine ──────────────────────────────────────────────────────────────
// SVG puro — sem biblioteca externa. Valores são normalizados ao container.
function SparkLine({
  values,
  uid,
  className = "",
}: {
  values: number[];
  uid: string;
  className?: string;
}) {
  if (values.length < 2) {
    return <div className={`${className} flex items-end justify-center`}><span className="text-[9px] text-muted-foreground/50">sem dados</span></div>;
  }
  const W = 100;
  const H = 32;
  const max = Math.max(...values, 1);
  const gradId = `sg-${uid}`;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * (H - 4) - 2;
    return [x, y] as [number, number];
  });
  const linePath = `M${pts.map(([x, y]) => `${x},${y}`).join(" L")}`;
  const fillPath = `${linePath} L${W},${H} L0,${H} Z`;
  const lastX = pts[pts.length - 1]![0];
  const lastY = pts[pts.length - 1]![1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="currentColor" />
    </svg>
  );
}

// ─── Delta Chip ─────────────────────────────────────────────────────────────
function DeltaChip({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null) return null;
  const delta = current - prev;
  if (delta === 0)
    return <span className="text-[9px] text-muted-foreground/60">= vs anterior</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ${
        up ? "text-hera-done" : "text-destructive"
      }`}
    >
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {up ? "+" : ""}
      {delta} vs ant.
    </span>
  );
}

// ─── Bar Chart (multi-metric over months) ───────────────────────────────────
const CHART_COLORS: Record<NumericMetricKey, string> = {
  leads_captados:       "hsl(var(--primary))",
  conteudos_criados:    "hsl(var(--hera-running) / 0.8)",
  conteudos_publicados: "hsl(var(--hera-done) / 0.9)",
  reunioes_realizadas:  "hsl(var(--hera-alert) / 0.9)",
  agendamentos:         "hsl(var(--destructive) / 0.7)",
};

function BarChart({
  data,
  activeKey,
}: {
  data: OperationMetric[];   // ascending order
  activeKey: NumericMetricKey;
}) {
  if (data.length === 0) return null;
  const W = 560;
  const H = 120;
  const padLeft = 28;
  const padBottom = 20;
  const chartW = W - padLeft;
  const chartH = H - padBottom;
  const values = data.map((m) => m[activeKey]);
  const max = Math.max(...values, 1);
  const barW = Math.min(32, chartW / data.length - 4);
  const gap = (chartW - barW * data.length) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }} aria-hidden>
      {/* Y gridlines (3 levels) */}
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = padBottom + chartH - t * chartH;
        return (
          <g key={t}>
            <line x1={padLeft} y1={y} x2={W} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <text x={padLeft - 4} y={y + 3} textAnchor="end" fontSize="8" fill="currentColor" fillOpacity="0.4">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((m, i) => {
        const v = values[i]!;
        const barH = (v / max) * chartH;
        const x = padLeft + gap + i * (barW + gap);
        const y = padBottom + chartH - barH;
        const isCurrent = i === data.length - 1;
        return (
          <g key={m.id}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={CHART_COLORS[activeKey]}
              fillOpacity={isCurrent ? 1 : 0.45}
              rx="2"
            />
            {/* value label on bar */}
            {v > 0 && (
              <text
                x={x + barW / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize="8"
                fill="currentColor"
                fillOpacity={isCurrent ? 0.9 : 0.5}
              >
                {v}
              </text>
            )}
            {/* month label */}
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              fillOpacity="0.5"
            >
              {formatPeriodLabel(m.period_month).slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────
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
  const [chartKey, setChartKey] = useState<NumericMetricKey>("leads_captados");

  useEffect(() => { setEditPeriod(currentPeriod); }, [currentPeriod]);

  useEffect(() => {
    const row = metrics.find((m) => m.period_month === editPeriod);
    setForm(row ? fieldsFromMetric(row) : { ...EMPTY_METRICS });
  }, [metrics, editPeriod]);

  function update<K extends keyof MetricFields>(key: K, value: MetricFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }
  function bumpNumber(key: NumericMetricKey, delta: number) {
    setForm((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
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
      await saveMetrics({ periodMonth: editPeriod, fields: { ...form, [field]: form[field] + 1 } });
    }
  }

  // Sort ascending for charts
  const metricsAsc = useMemo(
    () => [...metrics].sort((a, b) => a.period_month.localeCompare(b.period_month)),
    [metrics],
  );

  // Current and previous period rows for delta
  const currentRow = metrics.find((m) => m.period_month === currentPeriod) ?? null;
  const prevRow: OperationMetric | null = useMemo(() => {
    const sorted = [...metrics].sort((a, b) =>
      b.period_month.localeCompare(a.period_month),
    );
    return sorted.find((m) => m.period_month < currentPeriod) ?? null;
  }, [metrics, currentPeriod]);

  const busy = isSaving || isIncrementing;
  const isCurrentMonth = editPeriod === currentPeriod;

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

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
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

      {/* Quick add */}
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

      {/* KPI cards — sparkline + delta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRIC_LABELS.map(({ key, label, short }) => {
          const curVal = currentRow ? currentRow[key] : form[key];
          const prevVal = prevRow ? prevRow[key] : null;
          const sparkVals = metricsAsc.map((m) => m[key]);

          return (
            <button
              key={key}
              type="button"
              onClick={() => setChartKey(key)}
              className={[
                "hera-card p-4 text-left flex flex-col gap-2 transition-colors",
                chartKey === key ? "border-primary/40 bg-primary/5" : "hover:border-primary/20",
              ].join(" ")}
              title={`Ver tendência de ${label}`}
            >
              <div>
                <p className="hera-mono text-2xl font-semibold text-foreground leading-none">
                  {curVal}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                  {short}
                </p>
              </div>
              <DeltaChip current={curVal} prev={prevVal} />
              {sparkVals.length >= 2 && (
                <SparkLine
                  values={sparkVals}
                  uid={`${operationId}-${key}`}
                  className="h-8 text-primary mt-1"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bar chart — selected metric over all months */}
      {metricsAsc.length >= 2 && (
        <div className="hera-card p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="hera-label">
              Tendência mensal —{" "}
              <span className="normal-case font-normal text-foreground">
                {METRIC_LABELS.find((l) => l.key === chartKey)?.label}
              </span>
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {METRIC_LABELS.map(({ key, short }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChartKey(key)}
                  className={[
                    "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    chartKey === key
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {short}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={metricsAsc} activeKey={chartKey} />
          <p className="text-[10px] text-muted-foreground">
            Barra mais escura = mês atual. Clique em outro KPI para alternar.
          </p>
        </div>
      )}

      {/* Edit form */}
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

      {/* Historical table */}
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
                  const isEdit = m.period_month === editPeriod;
                  return (
                    <tr
                      key={m.id}
                      className={[
                        "border-b border-border/50 cursor-pointer transition-colors",
                        isEdit ? "bg-primary/5" : "hover:bg-accent/30",
                      ].join(" ")}
                      onClick={() => setEditPeriod(m.period_month)}
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {formatPeriodLabel(m.period_month)}
                        {m.period_month === currentPeriod && (
                          <span className="ml-1.5 text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            atual
                          </span>
                        )}
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
