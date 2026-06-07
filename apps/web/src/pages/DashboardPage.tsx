import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Building2, Plus, Loader2, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBootstrap } from "@/hooks/useBootstrap";
import { supabase } from "@/lib/supabase";
import type { Operation } from "@/types/index";

export function DashboardPage() {
  const { user, workspace, isSuperAdmin, signOut } = useAuth();
  const { bootstrapping, error: bootstrapError } = useBootstrap();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">HERA Arquiteto</span>
          {workspace && (
            <>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {workspace.name}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              super admin
            </span>
          )}
          <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Bootstrap states */}
        {bootstrapping && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Inicializando workspace...</span>
          </div>
        )}
        {bootstrapError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {bootstrapError}
          </div>
        )}

        {workspace && !bootstrapping && (
          <>
            {/* Page title + CTA */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Operações</h2>
                <p className="text-sm text-muted-foreground">
                  Blueprints gerados para o nicho {workspace.name}
                </p>
              </div>
              <button
                onClick={() => navigate("/operations/new")}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground
                           rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova Operação
              </button>
            </div>

            {/* Operations list */}
            {opsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando operações...</span>
              </div>
            ) : operations.length === 0 ? (
              <EmptyState onNew={() => navigate("/operations/new")} />
            ) : (
              <div className="space-y-2">
                {operations.map((op) => (
                  <OperationRow
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
    </div>
  );
}

function OperationRow({
  operation,
  onClick,
}: {
  operation: Operation;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 rounded-lg border border-border bg-card
                 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
    >
      <StatusDot status={operation.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{operation.nicho}</p>
        <p className="text-xs text-muted-foreground truncate">{operation.posicionamento}</p>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        <StatusBadge status={operation.status} />
        <span className="text-xs text-muted-foreground hidden sm:block">
          {formatDate(operation.created_at)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center space-y-4">
      <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">Nenhuma operação ainda</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Crie sua primeira operação para gerar o Blueprint Operacional Mestre e mapear a concorrência do nicho.
        </p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground
                   rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Nova Operação
      </button>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-yellow-400",
    running: "bg-blue-500 animate-pulse",
    done: "bg-green-500",
    error: "bg-red-500",
  };
  return (
    <span className={`h-2 w-2 rounded-full shrink-0 ${colors[status] ?? "bg-gray-400"}`} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    queued: "Na fila",
    running: "Processando",
    done: "Concluído",
    error: "Erro",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
