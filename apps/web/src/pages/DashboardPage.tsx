import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  Clock,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PHASES } from "@/lib/phases";
import { operadorNomeFromOperation } from "@/lib/operador-nome";
import { resolveOperadorTipo } from "@/lib/operador-tipo";
import { useAnimatedCount } from "@/hooks/useAnimatedCount";
import type { Operation, PhaseEvent } from "@/types/index";

export function DashboardPage() {
  const { workspace, bootstrapping, bootstrapError } = useAuth();
  const navigate = useNavigate();

  const { data: operations = [], isLoading: opsLoading } = useQuery<Operation[]>({
    queryKey: ["operations", workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspace?.id,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(
        (o) => o.status === "queued" || o.status === "running",
      );
      return hasActive ? 8000 : false;
    },
  });

  const activeCount = operations.filter(
    (o) => o.status === "queued" || o.status === "running",
  ).length;
  const doneCount = operations.filter((o) => o.status === "done").length;
  const errorCount = operations.filter((o) => o.status === "error").length;

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="hera-page">
        {bootstrapping && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Inicializando workspace...</span>
          </div>
        )}

        {bootstrapError && (
          <div className="hera-card border-destructive/40 px-5 py-4 text-destructive">
            {bootstrapError}
          </div>
        )}

        {workspace && !bootstrapping && (
          <>
            {/* Hero cockpit */}
            <div className="hera-cockpit-hero p-6 lg:p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="hera-label mb-2">Command center</p>
                  <h1 className="font-serif text-3xl lg:text-4xl font-semibold text-foreground">
                    Operações
                  </h1>
                  <p className="text-base text-muted-foreground mt-2">{workspace.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/operations/new")}
                  className="hera-btn-primary text-base px-6 py-3"
                >
                  <Plus className="h-5 w-5" />
                  Nova operação
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <StatTile
                  label="Total"
                  value={operations.length}
                  icon={Layers}
                  delay={0}
                />
                <StatTile
                  label="Em processamento"
                  value={activeCount}
                  icon={Zap}
                  variant="alert"
                  pulse={activeCount > 0}
                  delay={1}
                />
                <StatTile
                  label="Concluídas"
                  value={doneCount}
                  icon={CheckCircle2}
                  variant="done"
                  delay={2}
                />
                <StatTile
                  label="Com erro"
                  value={errorCount}
                  icon={AlertTriangle}
                  variant={errorCount > 0 ? "alert" : undefined}
                  delay={3}
                />
              </div>
            </div>

            {opsLoading ? (
              <DashboardSkeleton />
            ) : operations.length === 0 ? (
              <EmptyState onNew={() => navigate("/operations/new")} />
            ) : (
              <div className="space-y-4">
                <p className="hera-label px-1">Suas operações</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  {operations.map((op, i) => (
                    <OperationCard
                      key={op.id}
                      operation={op}
                      index={i}
                      onClick={() => navigate(`/operations/${op.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function OperationCard({
  operation,
  index,
  onClick,
}: {
  operation: Operation;
  index: number;
  onClick: () => void;
}) {
  const { data: phaseEvents = [] } = useQuery<PhaseEvent[]>({
    queryKey: ["phase_events", operation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phase_events")
        .select("phase, status")
        .eq("operation_id", operation.id);
      if (error) throw error;
      return data as PhaseEvent[];
    },
    staleTime: 30_000,
  });

  const donePhases =
    operation.status === "done"
      ? PHASES.length
      : phaseEvents.filter((e) => e.status === "done").length;
  const isActive = operation.status === "queued" || operation.status === "running";
  const tipo = resolveOperadorTipo(operation);
  const operadorNome = operadorNomeFromOperation(operation, "Operação");

  const currentPhaseLabel =
    operation.current_phase && isActive
      ? PHASES.find((p) => p.key === operation.current_phase)?.shortLabel
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "hera-card p-5 lg:p-6 text-left group w-full",
        isActive ? "border-hera-cyan/40 ring-1 ring-hera-cyan/20" : "hover:border-primary/40",
      ].join(" ")}
      style={{
        animation: "reveal-up 0.4s ease-out both",
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <div className="flex gap-5">
        <div className="relative shrink-0">
          <ProgressRing value={donePhases} max={PHASES.length} size={80} stroke={6} />
          <span className="hera-mono absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground rotate-0">
            {donePhases}/{PHASES.length}
          </span>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <StatusBadge status={operation.status} size="sm" />
            <span className="hera-mono text-xs text-muted-foreground ml-auto">
              {formatDate(operation.created_at)}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground leading-snug line-clamp-2">
              {operadorNome}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{operation.nicho}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {currentPhaseLabel && (
              <span className="flex items-center gap-1.5 text-hera-cyan">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fase: {currentPhaseLabel}
              </span>
            )}
            {operation.cost_usd != null && Number(operation.cost_usd) > 0 && (
              <span className="hera-mono text-muted-foreground">
                IA ${Number(operation.cost_usd).toFixed(2)}
              </span>
            )}
            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
              Abrir cockpit <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  variant,
  pulse,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "done" | "alert";
  pulse?: boolean;
  delay?: number;
}) {
  const animated = useAnimatedCount(value);
  const variantClass =
    variant === "done"
      ? "hera-stat-tile--done"
      : variant === "alert"
        ? "hera-stat-tile--alert"
        : "";

  return (
    <div
      className={["hera-stat-tile", variantClass, pulse ? "badge-running rounded-lg" : ""].join(
        " ",
      )}
      style={{ animation: "reveal-up 0.4s ease-out both", animationDelay: `${delay * 0.07}s` }}
    >
      <div className="flex items-center justify-between">
        <p className="hera-label">{label}</p>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <p className="hera-mono text-4xl font-bold text-foreground mt-1">{animated}</p>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="hera-cockpit-hero p-16 text-center space-y-5">
      <Clock className="h-14 w-14 text-primary/40 mx-auto" />
      <div className="space-y-2">
        <h3 className="font-serif text-2xl font-semibold text-foreground">
          Nenhuma operação ainda
        </h3>
        <p className="text-base text-muted-foreground max-w-md mx-auto">
          Crie sua primeira operação para gerar o Blueprint e mapear a concorrência do nicho.
        </p>
      </div>
      <button type="button" onClick={onNew} className="hera-btn-primary text-base px-6 py-3">
        <Plus className="h-5 w-5" />
        Nova operação
      </button>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
