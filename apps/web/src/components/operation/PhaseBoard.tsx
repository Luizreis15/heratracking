import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Radar,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { BLUEPRINT_SECTIONS } from "@/lib/blueprint-sections";
import { PHASES, phaseIndex } from "@/lib/phases";
import { operadorNomeFromOperation } from "@/lib/operador-nome";
import { resolveOperadorTipo } from "@/lib/operador-tipo";
import { MetricsSummary } from "@/components/operation/MetricsSummary";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTypewriter } from "@/hooks/useTypewriter";
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
  const tipo = resolveOperadorTipo(operation);
  const operadorNome = operadorNomeFromOperation(operation);

  const isActive = operation.status === "queued" || operation.status === "running";
  const currentIdx =
    operation.current_phase && isActive ? phaseIndex(operation.current_phase) : -1;

  return (
    <div className="hera-page space-y-8">
      {/* Hero cockpit */}
      <div className="hera-cockpit-hero p-6 lg:p-8">
        <div className="flex flex-wrap items-start gap-6 lg:gap-10">
          <div className="relative shrink-0">
            <ProgressRing value={doneCount} max={PHASES.length} size={96} stroke={7} />
            <span className="hera-mono absolute inset-0 flex items-center justify-center text-lg font-bold">
              {doneCount}/{PHASES.length}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="hera-label">Cockpit da operação</p>
              <span
                className={[
                  "text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full",
                  tipo === "saas_b2b"
                    ? "bg-hera-cyan/15 text-hera-cyan border border-hera-cyan/30"
                    : "bg-primary/15 text-primary border border-primary/30",
                ].join(" ")}
              >
                {tipo === "saas_b2b" ? "SaaS B2B" : "Agência"}
              </span>
              <StatusBadge status={operation.status} />
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-semibold text-foreground leading-tight">
              {operadorNome}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              {operation.nicho}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <QuickLink
              to={`/operations/${operationId}/blueprint`}
              icon={FileText}
              label="Blueprint"
            />
            <QuickLink
              to={`/operations/${operationId}/concorrencia`}
              icon={Users}
              label={`Concorrência (${competitorCount})`}
            />
            <QuickLink
              to={`/operations/${operationId}/analise`}
              icon={Building2}
              label="Análise"
            />
            <QuickLink
              to={`/operations/${operationId}/inteligencia`}
              icon={Radar}
              label="Intel"
            />
          </div>
        </div>

        {/* Phase stepper */}
        <div className="flex gap-2 mt-8 overflow-x-auto pb-1">
          {PHASES.map((phase, i) => {
            const event = phaseMap.get(phase.key);
            const phaseStatus = event?.status ?? "pending";
            const isCurrent = currentIdx === i;
            const pillClass =
              phaseStatus === "done"
                ? "hera-phase-pill--done"
                : phaseStatus === "running" || isCurrent
                  ? "hera-phase-pill--running"
                  : "hera-phase-pill--pending";

            return (
              <div key={phase.key} className={["hera-phase-pill", pillClass].join(" ")}>
                <PhaseStatusIcon status={phaseStatus} isCurrent={isCurrent} />
                <span className="hera-mono text-[11px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {phase.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Ticket" value={operation.ticket_alvo} delay={0} />
        <KpiCard label="Modelo" value={operation.modelo_entrega} delay={1} />
        <KpiCard
          label="Concorrentes"
          value={String(competitorCount)}
          href={`/operations/${operationId}/concorrencia`}
          delay={2}
          icon={Users}
        />
        <KpiCard
          label="Análise"
          value="Comparativo"
          href={`/operations/${operationId}/analise`}
          delay={3}
          icon={Target}
        />
        <KpiCard
          label="Operação"
          value={
            currentMonthMetrics && currentMonthMetrics.leads_captados > 0
              ? `${currentMonthMetrics.leads_captados} leads`
              : "KPIs"
          }
          href={`/operations/${operationId}/operacao`}
          delay={4}
          icon={BarChart3}
        />
        <KpiCard
          label="Custo IA"
          value={operation.cost_usd ? `$${Number(operation.cost_usd).toFixed(2)}` : "—"}
          delay={5}
          icon={Zap}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <MetricsSummary operationId={operationId} currentMonth={currentMonthMetrics} />

          {/* Deliverables grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {competitorCount > 0 && (
              <DeliverableCard
                title="Mapa de concorrência"
                meta={`${competitorCount} ${tipo === "saas_b2b" ? "players" : "agências"} mapeados`}
                href={`/operations/${operationId}/concorrencia`}
                icon={Users}
                done={phaseMap.get("pesquisa")?.status === "done"}
              />
            )}
            {BLUEPRINT_SECTIONS.filter((s) => sections[s.key] != null).map((section) => (
              <DeliverableCard
                key={section.key}
                title={section.label}
                meta="Seção pronta no Blueprint"
                href={`/operations/${operationId}/blueprint`}
                icon={FileText}
                done
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {isActive && (
            <>
              <div className="hera-progress-bar rounded-full" />
              <div className="hera-card p-5 border-hera-cyan/30 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-hera-cyan animate-spin shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {operation.status === "queued" ? "Na fila" : "Processando"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {operation.current_phase
                        ? `Fase: ${PHASES.find((p) => p.key === operation.current_phase)?.label ?? operation.current_phase}`
                        : "Aguardando worker"}
                    </p>
                  </div>
                </div>
                {operation.current_phase && (
                  <PhaseLogPanel
                    log={phaseMap.get(operation.current_phase)?.log ?? ""}
                    active
                  />
                )}
              </div>
              {operation.current_phase === "comercial" && <SpinMiniCard />}
            </>
          )}

          {operation.status === "error" && (
            <div className="hera-card p-5 border-destructive/40 space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-semibold">Erro no processamento</p>
              </div>
              <p className="hera-mono text-sm text-muted-foreground">{operation.error}</p>
            </div>
          )}

          {operation.status === "done" && doneCount === PHASES.length && (
            <div className="hera-card p-5 border-hera-done/40 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-hera-done" />
                <p className="text-base font-semibold">Jornada concluída</p>
              </div>
              <Link to={`/operations/${operationId}/blueprint`} className="hera-btn-primary w-full justify-center">
                Abrir Blueprint
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseLogPanel({ log, active }: { log: string; active: boolean }) {
  const lastLine = log.split("\n").filter(Boolean).pop() ?? "Iniciando...";
  const { displayed, done } = useTypewriter(lastLine, active);
  return (
    <div className="rounded-md bg-accent/30 px-3 py-2.5">
      <p className="hera-mono text-sm text-foreground leading-relaxed">
        {displayed}
        {!done && active && <span className="hera-typewriter-cursor" />}
      </p>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="hera-btn-ghost border border-border/60 text-sm px-3 py-2 hover:border-primary/40"
    >
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}

function DeliverableCard({
  title,
  meta,
  href,
  icon: Icon,
  done,
}: {
  title: string;
  meta: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  done?: boolean;
}) {
  return (
    <Link
      to={href}
      className={[
        "hera-card p-4 hover:border-primary/40 transition-colors group",
        done ? "border-hera-done/25" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{meta}</p>
          <p className="text-sm text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Abrir →
          </p>
        </div>
        {done && <CheckCircle2 className="h-5 w-5 text-hera-done shrink-0" />}
      </div>
    </Link>
  );
}

function KpiCard({
  label,
  value,
  href,
  delay = 0,
  icon: Icon,
}: {
  label: string;
  value: string;
  href?: string;
  delay?: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const style = { animation: "reveal-up 0.4s ease-out both", animationDelay: `${delay * 0.06}s` };
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="hera-label">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-primary/60 shrink-0" />}
      </div>
      <p className="hera-mono text-base font-semibold text-foreground mt-2 truncate">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="hera-stat-tile hover:border-primary/40 transition-colors"
        style={style}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="hera-stat-tile" style={style}>
      {inner}
    </div>
  );
}

function PhaseStatusIcon({
  status,
  isCurrent,
}: {
  status: string;
  isCurrent: boolean;
}) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-hera-done" />;
  if (status === "running" || isCurrent)
    return <Loader2 className="h-5 w-5 text-hera-cyan animate-spin" />;
  if (status === "error") return <AlertCircle className="h-5 w-5 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

function SpinMiniCard() {
  return (
    <details className="hera-card p-4 border-amber-500/30 group">
      <summary className="cursor-pointer flex items-center gap-2 list-none">
        <span className="text-sm font-bold text-amber-400 hera-mono">SPIN</span>
        <span className="text-sm text-muted-foreground flex-1">
          Estruturando perguntas do closer...
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {(["S — Situação", "P — Problema", "I — Implicação", "N — Necessidade"] as const).map(
          (label) => (
            <div key={label} className="hera-mono bg-accent/30 rounded px-2 py-2 text-muted-foreground">
              {label}
            </div>
          ),
        )}
      </div>
    </details>
  );
}

export function countDonePhases(phaseMap: Map<string, PhaseEvent>): number {
  return PHASES.filter((p) => phaseMap.get(p.key)?.status === "done").length;
}

export function currentPhaseIndex(operation: Operation): number | undefined {
  if (!operation.current_phase) return undefined;
  const idx = phaseIndex(operation.current_phase);
  return idx >= 0 ? idx : undefined;
}
