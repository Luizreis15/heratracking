import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Loader2, Clock, ChevronRight } from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { StatusBadge, PhaseProgressDots } from "@/components/ui/StatusBadge";
import { PHASES, phaseIndex } from "@/lib/phases";
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

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
      {bootstrapping && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Inicializando workspace...</span>
        </div>
      )}

      {bootstrapError && (
        <div className="hera-card border-destructive/40 px-4 py-3 text-sm text-destructive">
          {bootstrapError}
        </div>
      )}

      {workspace && !bootstrapping && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="hera-label mb-1">Workspace</p>
              <h1 className="font-serif text-3xl font-semibold text-foreground">Operações</h1>
              <p className="text-sm text-muted-foreground mt-1">{workspace.name}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/operations/new")}
              className="hera-btn-primary"
            >
              <Plus className="h-4 w-4" />
              Nova operação
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total" value={String(operations.length)} />
            <StatCard label="Em processamento" value={String(activeCount)} accent="running" />
            <StatCard label="Concluídas" value={String(doneCount)} accent="done" />
          </div>

          {opsLoading ? (
            <DashboardSkeleton />
          ) : operations.length === 0 ? (
            <EmptyState onNew={() => navigate("/operations/new")} />
          ) : (
            <div className="space-y-3">
              <p className="hera-label">Suas operações</p>
              {operations.map((op) => (
                <OperationCard
                  key={op.id}
                  operation={op}
                  onClick={() => navigate(`/operations/${op.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function OperationCard({
  operation,
  onClick,
}: {
  operation: Operation;
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

  const donePhases = phaseEvents.filter((e) => e.status === "done").length;
  const currentIdx =
    operation.current_phase && operation.status === "running"
      ? phaseIndex(operation.current_phase)
      : undefined;
  const isActive = operation.status === "queued" || operation.status === "running";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full hera-card px-4 py-4 hover:border-primary/40 transition-colors text-left group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{operation.nicho}</h3>
            <StatusBadge status={operation.status} size="xs" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{operation.posicionamento}</p>
          <div className="flex items-center gap-3 mt-3">
            <PhaseProgressDots
              doneCount={operation.status === "done" ? PHASES.length : donePhases}
              currentIndex={currentIdx}
              isRunning={isActive}
            />
            <span className="text-[10px] text-muted-foreground">
              {operation.status === "done"
                ? `${PHASES.length}/${PHASES.length} fases`
                : `${donePhases}/${PHASES.length} fases`}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className="text-[10px] text-muted-foreground">{formatDate(operation.created_at)}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "running" | "done";
}) {
  const accentClass =
    accent === "running"
      ? "text-hera-running"
      : accent === "done"
        ? "text-hera-done"
        : "text-foreground";

  return (
    <div className="hera-card px-4 py-4">
      <p className="hera-label">{label}</p>
      <p className={`text-2xl font-serif font-semibold mt-1 ${accentClass}`}>{value}</p>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="hera-card p-12 text-center space-y-4 max-w-md mx-auto">
      <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto" />
      <div className="space-y-1">
        <h3 className="font-serif text-lg font-semibold text-foreground">Nenhuma operação ainda</h3>
        <p className="text-sm text-muted-foreground">
          Crie sua primeira operação para gerar o Blueprint e mapear a concorrência do nicho.
        </p>
      </div>
      <button type="button" onClick={onNew} className="hera-btn-primary">
        <Plus className="h-4 w-4" />
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
