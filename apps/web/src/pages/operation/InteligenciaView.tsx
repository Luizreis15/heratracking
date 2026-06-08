import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Radar, RefreshCw } from "lucide-react";
import { MetaPremiumPanel } from "@/components/operation/MetaPremiumPanel";
import { supabase } from "@/lib/supabase";
import { useIntelEvents } from "@/hooks/useIntelEvents";
import {
  INTEL_EVENT_LABELS,
  formatIntelDate,
  groupIntelByDay,
} from "@/lib/intel-events";
import type { IntelEvent } from "@/types/index";
import type { OperationContext } from "./operation-context";

const FILTERS = ["todos", "post", "landing", "criativo", "oferta", "outro"] as const;

export function InteligenciaView() {
  const { operation, competitors, operationId } = useOutletContext<OperationContext>();
  const queryClient = useQueryClient();
  const busy =
    operation.status === "queued" ||
    operation.status === "running" ||
    operation.job_mode === "intel";

  const { data: events = [], isLoading, isError } = useIntelEvents(operationId, {
    polling: busy,
  });

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("todos");
  const [competitorFilter, setCompetitorFilter] = useState<string>("todos");
  const [scanning, setScanning] = useState(false);

  const isBusy = busy || scanning;

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter !== "todos" && e.event_type !== filter) return false;
      if (competitorFilter !== "todos" && e.competitor_nome !== competitorFilter) return false;
      return true;
    });
  }, [events, filter, competitorFilter]);

  const grouped = useMemo(() => groupIntelByDay(filtered), [filtered]);

  const competitorNames = useMemo(() => {
    const fromEvents = new Set(events.map((e) => e.competitor_nome));
    for (const c of competitors) fromEvents.add(c.nome);
    return [...fromEvents].sort();
  }, [events, competitors]);

  async function handleScan() {
    if (competitors.length === 0) {
      alert("Mapeie concorrentes antes de rodar o scan de inteligência.");
      return;
    }

    setScanning(true);
    const { error } = await supabase
      .from("operations")
      .update({
        job_mode: "intel",
        status: "queued",
        error: null,
        finished_at: null,
      })
      .eq("id", operationId);

    setScanning(false);

    if (error) {
      alert(`Erro: ${error.message}`);
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    void queryClient.invalidateQueries({ queryKey: ["phase_events", operationId] });
    void queryClient.invalidateQueries({ queryKey: ["intel_events", operationId] });
  }

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
          Feed indisponível. Aplique a migration{" "}
          <code className="text-xs">20260608140000_intel_events.sql</code> no Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hera-label mb-1">Monitoramento</p>
          <h1 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
            <Radar className="h-6 w-6 text-primary" />
            Inteligência
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posts, landings e criativos novos das agências concorrentes — fique um passo à frente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleScan()}
          disabled={isBusy || competitors.length === 0}
          className="hera-btn-primary"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isBusy ? "Escaneando..." : "Escanear agora"}
        </button>
      </div>

      <MetaPremiumPanel />

      {operation.last_intel_scan_at && (
        <p className="text-xs text-muted-foreground">
          Último scan: {formatIntelDate(operation.last_intel_scan_at)}
        </p>
      )}

      {isBusy && (
        <div className="flex items-center gap-3 hera-card px-4 py-3 border-hera-running/30">
          <Loader2 className="h-5 w-5 text-hera-running animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Varredura em andamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O worker pesquisa novidades na web — 1–3 min. O feed atualiza automaticamente.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "text-[10px] px-2.5 py-1 rounded-full border capitalize",
              filter === f
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            ].join(" ")}
          >
            {f === "todos" ? "Todos" : INTEL_EVENT_LABELS[f as IntelEvent["event_type"]]?.label ?? f}
          </button>
        ))}
      </div>

      {competitorNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCompetitorFilter("todos")}
            className={[
              "text-[10px] px-2.5 py-1 rounded-full border",
              competitorFilter === "todos"
                ? "border-primary/50 text-primary"
                : "border-border text-muted-foreground",
            ].join(" ")}
          >
            Todas agências
          </button>
          {competitorNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCompetitorFilter(name)}
              className={[
                "text-[10px] px-2.5 py-1 rounded-full border",
                competitorFilter === name
                  ? "border-primary/50 text-primary"
                  : "border-border text-muted-foreground",
              ].join(" ")}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="hera-card p-12 text-center space-y-3">
          <Radar className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Nenhuma novidade no feed
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {competitors.length === 0
              ? "Mapeie concorrentes na aba Concorrência, depois rode o primeiro scan."
              : "Clique em Escanear agora para buscar posts, landings e criativos recentes."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([day, dayEvents]) => (
            <div key={day}>
              <p className="hera-label mb-3 capitalize">{day}</p>
              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <IntelEventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IntelEventCard({ event: e }: { event: IntelEvent }) {
  const typeCfg = INTEL_EVENT_LABELS[e.event_type];

  return (
    <div className="hera-card p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={[
              "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
              typeCfg.color,
            ].join(" ")}
          >
            {typeCfg.label}
          </span>
          <span className="text-xs font-semibold text-foreground truncate">{e.competitor_nome}</span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatIntelDate(e.detected_at)}
        </span>
      </div>

      <p className="text-sm font-medium text-foreground">{e.titulo}</p>

      {e.resumo && (
        <p className="text-xs text-muted-foreground leading-relaxed">{e.resumo}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {e.url && (
          <a
            href={e.url.startsWith("http") ? e.url : `https://${e.url}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver fonte <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {e.fonte && (
          <span
            className={[
              "text-[10px] px-1.5 py-0.5 rounded",
              e.fonte.startsWith("meta_")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {e.fonte.replace("meta_graph:", "Meta · ").replace("meta_ad_library", "Ad Library")}
          </span>
        )}
      </div>
    </div>
  );
}
