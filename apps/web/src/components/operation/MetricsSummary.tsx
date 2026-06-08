import { Link } from "react-router-dom";
import { BarChart3, Plus } from "lucide-react";
import { METRIC_LABELS, metricToFields } from "@/lib/operation-metrics";
import type { OperationMetric } from "@/types/index";

type Props = {
  operationId: string;
  currentMonth: OperationMetric | null;
  compact?: boolean;
};

export function MetricsSummary({ operationId, currentMonth, compact }: Props) {
  const fields = metricToFields(currentMonth);
  const hasData = METRIC_LABELS.some(({ key }) => fields[key] > 0);

  if (compact) {
    return (
      <Link
        to={`/operations/${operationId}/operacao`}
        className="hera-card px-3 py-2.5 hover:border-primary/40 transition-colors block"
      >
        <p className="hera-label">Operação</p>
        <p className="text-sm font-semibold text-foreground mt-1">
          {hasData ? `${fields.leads_captados} leads` : "Registrar KPIs"}
        </p>
      </Link>
    );
  }

  return (
    <div className="hera-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Operação — mês atual</p>
        </div>
        <Link
          to={`/operations/${operationId}/operacao`}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Atualizar
        </Link>
      </div>

      {!hasData ? (
        <p className="text-xs text-muted-foreground">
          Nenhum KPI registrado este mês.{" "}
          <Link to={`/operations/${operationId}/operacao`} className="text-primary hover:underline">
            Começar a monitorar →
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {METRIC_LABELS.map(({ key, short }) => (
            <div key={key} className="hera-card px-2.5 py-2 text-center">
              <p className="hera-mono text-lg font-semibold text-foreground leading-none">
                {fields[key]}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wide">
                {short}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
