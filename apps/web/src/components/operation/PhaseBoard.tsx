import { useState, useEffect, useRef } from "react";
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
import { sanitizeGenerationLogLine } from "@/lib/sanitize-generation-log";
import { resolveOperadorTipo } from "@/lib/operador-tipo";
import { MetricsSummary } from "@/components/operation/MetricsSummary";
import { RegenerateOperationButton } from "@/components/operation/RegenerateOperationButton";
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

  // Track sections that just appeared for the flash animation
  const prevSectionKeys = useRef<Set<string>>(new Set());
  const [newSections, setNewSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const current = new Set(
      Object.keys(sections).filter((k) => sections[k] != null),
    );
    const prev = prevSectionKeys.current;
    const added = new Set([...current].filter((k) => !prev.has(k)));
    if (added.size > 0) {
      setNewSections(added);
      const t = setTimeout(() => setNewSections(new Set()), 2200);
      return () => clearTimeout(t);
    }
    prevSectionKeys.current = current;
  }, [sections]);

  return (
    <div className="hera-page space-y-6">
      {/* Hero cockpit — always visible */}
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
            <QuickLink to={`/operations/${operationId}/blueprint`} icon={FileText} label="Blueprint" />
            <QuickLink to={`/operations/${operationId}/concorrencia`} icon={Users} label={`Concorrência (${competitorCount})`} />
            <QuickLink to={`/operations/${operationId}/analise`} icon={Building2} label="Análise" />
            <QuickLink to={`/operations/${operationId}/inteligencia`} icon={Radar} label="Intel" />
            {!isActive && (
              <RegenerateOperationButton operationId={operationId} />
            )}
          </div>
        </div>

        {/* Phase stepper — horizontal strip */}
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

      {/* ─── ACTIVE: live cockpit ──────────────────────── */}
      {isActive && (
        <>
          {/* Banner */}
          <div className="hera-progress-bar rounded-full" />
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-hera-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-hera-cyan" />
            </span>
            <p className="hera-mono text-xs text-hera-cyan font-semibold uppercase tracking-widest">
              Gerando ao vivo
            </p>
            <p className="text-xs text-muted-foreground">
              — acompanhe cada seção sendo criada em tempo real
            </p>
          </div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Phase timeline (left) */}
            <div className="space-y-2">
              <p className="hera-label px-1 mb-3">Pipeline</p>
              {PHASES.map((phase, i) => {
                const event = phaseMap.get(phase.key);
                const status = event?.status ?? "pending";
                const isCurrent = currentIdx === i;
                const isDone = status === "done";
                const isRunning = isCurrent && isActive;

                return (
                  <div
                    key={phase.key}
                    className={[
                      "rounded-xl border px-4 py-3 transition-all duration-500",
                      isDone
                        ? "border-hera-done/25 opacity-60"
                        : isRunning
                          ? "hera-phase-live"
                          : "border-border/20 opacity-30",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <PhaseStatusIcon status={status} isCurrent={isRunning} />
                      <div className="flex-1 min-w-0">
                        <p
                          className={[
                            "text-sm font-semibold leading-tight",
                            isRunning
                              ? "text-hera-cyan"
                              : isDone
                                ? "text-hera-done"
                                : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {phase.label}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {phase.description}
                        </p>
                      </div>
                    </div>

                    {/* Expanded log for current phase */}
                    {isRunning && operation.current_phase && (
                      <div className="mt-3">
                        <PhaseLogPanel
                          log={phaseMap.get(operation.current_phase)?.log ?? ""}
                          active
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live sections grid (right) */}
            <div>
              <p className="hera-label px-1 mb-3">
                Seções do Blueprint —{" "}
                <span className="text-hera-done">
                  {Object.values(sections).filter(Boolean).length}
                </span>
                /{BLUEPRINT_SECTIONS.length} geradas
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {BLUEPRINT_SECTIONS.map((section, i) => {
                  const data = sections[section.key];
                  const generated = data != null;
                  const generating =
                    !generated && section.phase === operation.current_phase && isActive;
                  return (
                    <SectionLiveCard
                      key={section.key}
                      section={section}
                      operationId={operationId}
                      status={generated ? "done" : generating ? "generating" : "pending"}
                      isNew={newSections.has(section.key)}
                      index={i}
                    />
                  );
                })}
              </div>

              {/* Competitor card */}
              {competitorCount > 0 && (
                <div className="mt-3">
                  <Link
                    to={`/operations/${operationId}/concorrencia`}
                    className="hera-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors group hera-section-appear"
                  >
                    <CheckCircle2 className="h-4 w-4 text-hera-done shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Mapa de concorrência
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {competitorCount} {tipo === "saas_b2b" ? "players" : "agências"} mapeados
                      </p>
                    </div>
                    <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Ver →
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── DONE: deliverables layout ───────────────── */}
      {!isActive && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Ticket" value={operation.ticket_alvo} delay={0} />
            <KpiCard label="Modelo" value={operation.modelo_entrega} delay={1} />
            <KpiCard label="Concorrentes" value={String(competitorCount)} href={`/operations/${operationId}/concorrencia`} delay={2} icon={Users} />
            <KpiCard label="Análise" value="Comparativo" href={`/operations/${operationId}/analise`} delay={3} icon={Target} />
            <KpiCard
              label="Operação"
              value={currentMonthMetrics && currentMonthMetrics.leads_captados > 0 ? `${currentMonthMetrics.leads_captados} leads` : "KPIs"}
              href={`/operations/${operationId}/operacao`}
              delay={4}
              icon={BarChart3}
            />
            <KpiCard label="Custo IA" value={operation.cost_usd ? `$${Number(operation.cost_usd).toFixed(2)}` : "—"} delay={5} icon={Zap} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <MetricsSummary operationId={operationId} currentMonth={currentMonthMetrics} />

              {operation.status === "error" && (
                <div className="hera-card p-5 border-destructive/40 space-y-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-semibold">Erro no processamento</p>
                  </div>
                  <p className="hera-mono text-sm text-muted-foreground">{operation.error}</p>
                  <RegenerateOperationButton operationId={operationId} />
                </div>
              )}

              {/* Deliverables */}
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
                    href={`/operations/${operationId}/blueprint/${section.key}`}
                    icon={FileText}
                    done
                  />
                ))}
              </div>
            </div>

            <div>
              {operation.status === "done" && doneCount === PHASES.length && (
                <div className="hera-card p-5 border-hera-done/40 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-hera-done" />
                    <p className="text-base font-semibold">Jornada concluída</p>
                  </div>
                  <Link
                    to={`/operations/${operationId}/blueprint`}
                    className="hera-btn-primary w-full justify-center"
                  >
                    Abrir Blueprint
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function SectionLiveCard({
  section,
  operationId,
  status,
  isNew,
  index,
}: {
  section: (typeof BLUEPRINT_SECTIONS)[number];
  operationId: string;
  status: "pending" | "generating" | "done";
  isNew: boolean;
  index: number;
}) {
  const num = String(index + 1).padStart(2, "0");

  if (status === "pending") {
    return (
      <div className="hera-card px-4 py-4 opacity-20 border-dashed select-none">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="hera-mono text-[10px] text-muted-foreground/50 w-5">{num}</span>
          <p className="text-sm text-muted-foreground">{section.label}</p>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-border/40 w-full" />
          <div className="h-1.5 rounded-full bg-border/30 w-3/4" />
          <div className="h-1.5 rounded-full bg-border/20 w-1/2" />
        </div>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="hera-card px-4 py-4 border-hera-cyan/40 badge-running overflow-hidden">
        <div className="flex items-center gap-2.5 mb-3">
          <Loader2 className="h-4 w-4 text-hera-cyan animate-spin shrink-0" />
          <p className="text-sm font-semibold text-hera-cyan">{section.label}</p>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full hera-shimmer w-full" />
          <div className="h-1.5 rounded-full hera-shimmer w-4/5" style={{ animationDelay: "0.3s" }} />
          <div className="h-1.5 rounded-full hera-shimmer w-2/3" style={{ animationDelay: "0.6s" }} />
        </div>
        <p className="text-[11px] text-hera-cyan/60 mt-3 hera-mono">
          Gerando conteúdo...
          <span className="hera-typewriter-cursor" />
        </p>
      </div>
    );
  }

  // done
  return (
    <Link
      to={`/operations/${operationId}/blueprint/${section.key}`}
      className={[
        "hera-card px-4 py-4 hover:border-primary/40 transition-all group block",
        isNew ? "hera-section-appear" : "border-hera-done/25",
      ].join(" ")}
      style={
        isNew
          ? undefined
          : {
              animation: "reveal-up 0.35s ease-out both",
              animationDelay: `${index * 0.04}s`,
            }
      }
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-hera-done shrink-0" />
          <p className="text-sm font-semibold text-foreground leading-tight">{section.label}</p>
        </div>
        <span className="hera-mono text-[10px] font-bold text-hera-done uppercase tracking-wide shrink-0">
          Pronto
        </span>
      </div>
      <div className="space-y-1.5 opacity-30">
        <div className="h-1.5 rounded-full bg-foreground/30 w-full" />
        <div className="h-1.5 rounded-full bg-foreground/20 w-3/4" />
      </div>
      <p className="text-xs text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        Abrir seção →
      </p>
    </Link>
  );
}

function PhaseLogPanel({ log, active }: { log: string; active: boolean }) {
  const raw = log.split("\n").filter(Boolean).pop() ?? "Iniciando etapa...";
  const lastLine = sanitizeGenerationLogLine(raw);
  const { displayed, done } = useTypewriter(lastLine, active);
  return (
    <div className="rounded-lg bg-hera-navy-deep/60 px-3 py-3 border border-hera-cyan/20">
      <p className="text-xs text-hera-cyan/90 leading-relaxed">
        <span className="text-hera-cyan/40 mr-2">›</span>
        {displayed}
        {!done && active && <span className="hera-typewriter-cursor" />}
      </p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} className="hera-btn-ghost border border-border/60 text-sm px-3 py-2 hover:border-primary/40">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}

function DeliverableCard({ title, meta, href, icon: Icon, done }: { title: string; meta: string; href: string; icon: React.ComponentType<{ className?: string }>; done?: boolean }) {
  return (
    <Link to={href} className={["hera-card p-4 hover:border-primary/40 transition-colors group", done ? "border-hera-done/25" : ""].join(" ")}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{meta}</p>
          <p className="text-sm text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</p>
        </div>
        {done && <CheckCircle2 className="h-5 w-5 text-hera-done shrink-0" />}
      </div>
    </Link>
  );
}

function KpiCard({ label, value, href, delay = 0, icon: Icon }: { label: string; value: string; href?: string; delay?: number; icon?: React.ComponentType<{ className?: string }> }) {
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
  if (href) return <Link to={href} className="hera-stat-tile hover:border-primary/40 transition-colors" style={style}>{inner}</Link>;
  return <div className="hera-stat-tile" style={style}>{inner}</div>;
}

function PhaseStatusIcon({ status, isCurrent }: { status: string; isCurrent: boolean }) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 text-hera-done" />;
  if (status === "running" || isCurrent) return <Loader2 className="h-5 w-5 text-hera-cyan animate-spin" />;
  if (status === "error") return <AlertCircle className="h-5 w-5 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

export function countDonePhases(phaseMap: Map<string, PhaseEvent>): number {
  return PHASES.filter((p) => phaseMap.get(p.key)?.status === "done").length;
}

export function currentPhaseIndex(operation: Operation): number | undefined {
  if (!operation.current_phase) return undefined;
  const idx = phaseIndex(operation.current_phase);
  return idx >= 0 ? idx : undefined;
}
