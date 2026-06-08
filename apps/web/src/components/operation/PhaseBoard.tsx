import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  Users,
} from "lucide-react";
import { BLUEPRINT_SECTIONS } from "@/lib/blueprint-sections";
import { PHASES, phaseIndex } from "@/lib/phases";
import { MetricsSummary } from "@/components/operation/MetricsSummary";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Operation, OperationMetric, PhaseEvent } from "@/types/index";
import type { Json } from "@/types/index";

type Props = {
  operation: Operation;
  phaseMap: Map<string, PhaseEvent>;
  sections: Record<string, Json>;
  competitorCount: number;
  currentMonthMetrics: OperationMetric | null;
  operationId: string;
};

export function PhaseBoard({
  operation,
  phaseMap,
  sections,
  competitorCount,
  currentMonthMetrics,
  operationId,
}: Props) {
  const doneCount = PHASES.filter((p) => phaseMap.get(p.key)?.status === "done").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hera-label mb-1">Jornada da operação</p>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            {operation.nicho}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-2">
            {operation.posicionamento}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="hera-label">Progresso</p>
            <p className="text-sm font-semibold text-foreground">
              {doneCount}/{PHASES.length} fases
            </p>
          </div>
          <StatusBadge status={operation.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Ticket-alvo" value={operation.ticket_alvo} />
        <KpiCard label="Modelo" value={operation.modelo_entrega} />
        <KpiCard
          label="Concorrentes"
          value={String(competitorCount)}
          href={`/operations/${operationId}/concorrencia`}
        />
        <KpiCard
          label="Análise"
          value="Perfil interno"
          href={`/operations/${operationId}/analise`}
        />
        <KpiCard
          label="Operação"
          value={
            currentMonthMetrics && currentMonthMetrics.leads_captados > 0
              ? `${currentMonthMetrics.leads_captados} leads`
              : "KPIs"
          }
          href={`/operations/${operationId}/operacao`}
        />
        <KpiCard
          label="Custo IA"
          value={operation.cost_usd ? `$${Number(operation.cost_usd).toFixed(2)}` : "—"}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <MetricsSummary
          operationId={operationId}
          currentMonth={currentMonthMetrics}
        />
        <Link
          to={`/operations/${operationId}/inteligencia`}
          className="hera-card p-4 hover:border-primary/40 transition-colors flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-primary text-sm">🔭</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Inteligência</p>
            <p className="text-xs text-muted-foreground">Monitorar concorrentes</p>
          </div>
        </Link>
      </div>

      {(operation.status === "queued" || operation.status === "running") && (
        <div className="flex items-center gap-3 hera-card px-4 py-3 border-hera-running/30">
          <Loader2 className="h-5 w-5 text-hera-running animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {operation.status === "queued" ? "Na fila do worker" : "Gerando entregáveis..."}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              As colunas atualizam automaticamente conforme cada fase conclui.
            </p>
          </div>
        </div>
      )}

      {operation.status === "error" && (
        <div className="flex items-start gap-3 hera-card px-4 py-3 border-destructive/40">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Erro no processamento</p>
            <p className="hera-mono text-xs text-muted-foreground mt-0.5">
              {operation.error ?? "Erro desconhecido"}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-max">
          {PHASES.map((phase, i) => {
            const event = phaseMap.get(phase.key);
            const phaseStatus = event?.status ?? "pending";
            const isCurrent =
              operation.current_phase === phase.key &&
              (operation.status === "running" || operation.status === "queued");
            const phaseSections = BLUEPRINT_SECTIONS.filter(
              (s) => s.phase === phase.key && sections[s.key] != null,
            );

            return (
              <div
                key={phase.key}
                className={[
                  "w-52 shrink-0 flex flex-col rounded-lg border",
                  isCurrent
                    ? "phase-running bg-hera-cyan/5"
                    : phaseStatus === "done"
                      ? "border-hera-done/30 bg-hera-surface/50"
                      : "border-border bg-hera-surface/30",
                ].join(" ")}
              >
                <div className="px-3 py-3 border-b border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="hera-mono text-[10px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <PhaseStatusIcon status={phaseStatus} isCurrent={isCurrent} />
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-1 leading-tight">
                    {phase.shortLabel}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {phase.description}
                  </p>
                </div>

                <div className="flex-1 p-2 space-y-2 min-h-[140px]">
                  {phase.key === "pesquisa" && competitorCount > 0 && (
                    <BoardCard
                      title="Radar concorrentes"
                      meta={`${competitorCount} agências`}
                      icon={Users}
                      done={phaseStatus === "done"}
                      href={`/operations/${operationId}/concorrencia`}
                    />
                  )}

                  {phaseSections.map((section) => (
                    <BoardCard
                      key={section.key}
                      title={section.label}
                      meta="Entregável pronto"
                      done
                      href={`/operations/${operationId}/blueprint`}
                    />
                  ))}

                  {phaseSections.length === 0 &&
                    !(phase.key === "pesquisa" && competitorCount > 0) && (
                      <div className="hera-card px-3 py-4 text-center border-dashed">
                        {phaseStatus === "running" || isCurrent ? (
                          <>
                            <Loader2 className="h-4 w-4 text-hera-running animate-spin mx-auto" />
                            <p className="text-[10px] text-muted-foreground mt-2">
                              Em processamento
                            </p>
                          </>
                        ) : phaseStatus === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-hera-done mx-auto" />
                        ) : (
                          <>
                            <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                            <p className="text-[10px] text-muted-foreground mt-2">Pendente</p>
                          </>
                        )}
                      </div>
                    )}

                  {event?.log && (phaseStatus === "running" || isCurrent) && (
                    <p className="hera-mono text-[10px] text-muted-foreground line-clamp-3 px-1">
                      {event.log.split("\n").pop()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {operation.status === "done" && doneCount === PHASES.length && (
        <div className="flex items-center justify-between hera-card px-4 py-3 border-hera-done/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-hera-done" />
            <div>
              <p className="text-sm font-medium text-foreground">Jornada concluída</p>
              <p className="text-xs text-muted-foreground">
                Revise o Blueprint e o mapa de concorrência.
              </p>
            </div>
          </div>
          <Link
            to={`/operations/${operationId}/blueprint`}
            className="hera-btn-primary text-xs"
          >
            Abrir Blueprint
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function BoardCard({
  title,
  meta,
  icon: Icon,
  done,
  href,
}: {
  title: string;
  meta: string;
  icon?: React.ComponentType<{ className?: string }>;
  done?: boolean;
  href: string;
}) {
  return (
    <Link
      to={href}
      className={[
        "block hera-card px-3 py-2.5 hover:border-primary/40 transition-colors group",
        done ? "border-hera-done/25" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{meta}</p>
        </div>
        {Icon ? (
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-hera-done shrink-0" />
        ) : null}
      </div>
      <p className="text-[10px] text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Ver detalhes →
      </p>
    </Link>
  );
}

function KpiCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="hera-label">{label}</p>
      <p className="hera-mono text-sm font-semibold text-foreground mt-1 truncate">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="hera-card px-3 py-2.5 hover:border-primary/40 transition-colors">
        {inner}
      </Link>
    );
  }
  return <div className="hera-card px-3 py-2.5">{inner}</div>;
}

function PhaseStatusIcon({
  status,
  isCurrent,
}: {
  status: string;
  isCurrent: boolean;
}) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-hera-done" />;
  if (status === "running" || isCurrent)
    return <Loader2 className="h-4 w-4 text-hera-running animate-spin" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/25" />;
}

export function countDonePhases(phaseMap: Map<string, PhaseEvent>): number {
  return PHASES.filter((p) => phaseMap.get(p.key)?.status === "done").length;
}

export function currentPhaseIndex(operation: Operation): number | undefined {
  if (!operation.current_phase) return undefined;
  const idx = phaseIndex(operation.current_phase);
  return idx >= 0 ? idx : undefined;
}
