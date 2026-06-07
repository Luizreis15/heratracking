import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Operation, PhaseEvent } from "@/types/index";

const PHASES: { key: string; label: string; description: string }[] = [
  { key: "pesquisa", label: "Pesquisa + ICP", description: "Mapeamento de mercado, concorrentes e cliente ideal" },
  { key: "oferta", label: "Oferta / Escada de Valor", description: "Estrutura de oferta, precificação e escada de upsell" },
  { key: "comercial", label: "Processo Comercial", description: "SDR, closer, roteiro de call e carta de vendas" },
  { key: "posicionamento", label: "Posicionamento Digital", description: "Statement, narrativa e pilares de conteúdo" },
  { key: "trafego", label: "Tráfego + Funil", description: "Mapa de funil, campanhas, ângulos de criativo e KPIs" },
  { key: "blueprint", label: "Consolidação — Blueprint", description: "Blueprint Operacional Mestre + checklist de implementação" },
];

export function OperationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: operation, isLoading: opLoading } = useQuery<Operation>({
    queryKey: ["operation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 5000 : false;
    },
  });

  const { data: phaseEvents = [] } = useQuery<PhaseEvent[]>({
    queryKey: ["phase_events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phase_events")
        .select("*")
        .eq("operation_id", id!)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
    refetchInterval: () => {
      if (!operation) return false;
      return operation.status === "running" ? 3000 : false;
    },
  });

  if (opLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Operação não encontrada.</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm underline">
          Voltar
        </button>
      </div>
    );
  }

  const phaseMap = new Map(phaseEvents.map((e) => [e.phase, e]));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{operation.nicho}</h1>
          <p className="text-xs text-muted-foreground truncate">{operation.posicionamento}</p>
        </div>
        <StatusBadge status={operation.status} />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetaCard label="Ticket-alvo" value={operation.ticket_alvo} />
          <MetaCard label="Modelo" value={operation.modelo_entrega} />
          <MetaCard
            label="Custo estimado"
            value={operation.cost_usd ? `$${operation.cost_usd.toFixed(3)}` : "—"}
          />
        </div>

        {/* Status banner */}
        {operation.status === "queued" && (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Job na fila</p>
              <p className="text-xs text-yellow-700">
                O worker vai pegar esta operação e iniciar o processamento em instantes.
              </p>
            </div>
          </div>
        )}
        {operation.status === "error" && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erro no processamento</p>
              <p className="text-xs text-red-700 mt-1 font-mono">{operation.error ?? "Erro desconhecido"}</p>
            </div>
          </div>
        )}

        {/* Pipeline */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Pipeline de Fases</h2>
          <div className="space-y-2">
            {PHASES.map((phase, i) => {
              const event = phaseMap.get(phase.key);
              const phaseStatus = event?.status ?? "pending";
              const isCurrentPhase =
                operation.current_phase === phase.key && operation.status === "running";

              return (
                <PhaseCard
                  key={phase.key}
                  index={i + 1}
                  label={phase.label}
                  description={phase.description}
                  status={phaseStatus}
                  log={event?.log ?? null}
                  isCurrent={isCurrentPhase}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function PhaseCard({
  index,
  label,
  description,
  status,
  log,
  isCurrent,
}: {
  index: number;
  label: string;
  description: string;
  status: string;
  log: string | null;
  isCurrent: boolean;
}) {
  return (
    <div
      className={[
        "flex items-start gap-4 rounded-lg border px-4 py-3 transition-colors",
        isCurrent ? "border-primary/30 bg-primary/5" : "border-border bg-card",
        status === "done" ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="mt-0.5 shrink-0">
        {status === "done" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        {status === "running" && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
        {status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
        {status === "pending" && (
          <div className="h-5 w-5 flex items-center justify-center">
            <Circle className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{String(index).padStart(2, "0")}</span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {log && (
          <p className="text-xs text-muted-foreground mt-1.5 font-mono leading-relaxed line-clamp-3">
            {log}
          </p>
        )}
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-yellow-100 text-yellow-800 border-yellow-200",
    running: "bg-blue-100 text-blue-800 border-blue-200",
    done: "bg-green-100 text-green-800 border-green-200",
    error: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<string, string> = {
    queued: "Na fila",
    running: "Processando",
    done: "Concluído",
    error: "Erro",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${styles[status] ?? styles.queued}`}>
      {labels[status] ?? status}
    </span>
  );
}
