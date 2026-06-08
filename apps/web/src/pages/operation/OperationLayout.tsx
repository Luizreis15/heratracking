import { useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOperationMetrics } from "@/hooks/useOperationMetrics";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import type { Blueprint, Competitor, Operation, PhaseEvent } from "@/types/index";
import type { Json } from "@/types/index";
import type { OperationContext } from "./operation-context";

export function OperationLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Supabase Realtime ────────────────────────────────────────────────────────
  // Single channel per operation — invalida cache ao vivo quando o worker grava.
  // When a row changes the worker wrote, the query cache is immediately
  // invalidated so the UI reflects the new state within ~100 ms instead of
  // waiting for the next polling interval (now kept at 30 s as a fallback only).
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`op-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operations", filter: `id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["operation", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "phase_events", filter: `operation_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["phase_events", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blueprints", filter: `operation_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["blueprint", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competitors", filter: `operation_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["competitors", id] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "intel_events", filter: `operation_id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["intel_events", id] });
          void queryClient.invalidateQueries({ queryKey: ["intel_badge", id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comparison_reports", filter: `operation_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["comparison_report", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_items", filter: `operation_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["content_items", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operation_metrics", filter: `operation_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["operation_metrics", id] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // ── Queries (30 s fallback poll while job is active) ─────────────────────────
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
      return status === "queued" || status === "running" ? 30_000 : false;
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
      const s = operation?.status;
      return s === "queued" || s === "running" ? 30_000 : false;
    },
  });

  const { data: blueprint } = useQuery<Blueprint | null>({
    queryKey: ["blueprint", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blueprints")
        .select("*")
        .eq("operation_id", id!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: () => {
      const s = operation?.status;
      return s === "queued" || s === "running" ? 30_000 : false;
    },
  });

  const { currentMonth: currentMonthMetrics } = useOperationMetrics(id);

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitors")
        .select("*")
        .eq("operation_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
    refetchInterval: () => {
      const s = operation?.status;
      return s === "queued" || s === "running" ? 30_000 : false;
    },
  });

  if (opLoading) {
    return <PageSkeleton />;
  }

  if (!operation || !id) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">Operação não encontrada.</p>
        <button type="button" onClick={() => navigate("/")} className="text-primary text-sm underline">
          Voltar
        </button>
      </div>
    );
  }

  const phaseMap = new Map(phaseEvents.map((e) => [e.phase, e]));
  const sections = (blueprint?.sections ?? {}) as Record<string, Json>;

  const ctx: OperationContext = {
    operation,
    phaseEvents,
    phaseMap,
    blueprint: blueprint ?? null,
    sections,
    competitors,
    currentMonthMetrics,
    operationId: id,
    isLoading: opLoading,
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <Outlet context={ctx} />
    </main>
  );
}
