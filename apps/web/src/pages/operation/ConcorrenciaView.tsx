import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { toastError, toastWarning } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import {
  formatSeedsForTextarea,
  mergeSeeds,
  parseSeedsFromJson,
  parseSeedsFromText,
  type ConcorrenteSeed,
} from "@/lib/concorrente-seeds";
import type { Competitor } from "@/types/index";
import type { OperationContext } from "./operation-context";

export function ConcorrenciaView() {
  const { operation, competitors } = useOutletContext<OperationContext>();
  const existingSeeds = parseSeedsFromJson(operation.concorrentes_seeds);
  const busy = operation.status === "queued" || operation.status === "running";

  return (
    <div className="space-y-6">
      <div>
        <p className="hera-label mb-1">Radar competitivo</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Agências Concorrentes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados brutos no banco — ticket, oferta, posicionamento de cada agência. Para decisões
          estratégicas, use{" "}
          <Link to={`/operations/${operation.id}/hera-dg`} className="text-primary hover:underline">
            Análise →
          </Link>
        </p>
      </div>

      <EnrichCompetitorsPanel
        operationId={operation.id}
        busy={busy}
        existingSeeds={existingSeeds}
      />

      {busy && (
        <div className="flex items-center gap-3 hera-card px-4 py-3 border-hera-running/30">
          <Loader2 className="h-5 w-5 text-hera-running animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Pesquisando concorrentes na web</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pode levar 1–3 minutos. Os cards atualizam automaticamente.
            </p>
          </div>
        </div>
      )}

      {competitors.length > 0 && (
        <Link
          to={`/operations/${operation.id}/hera-dg`}
          className="hera-card block p-4 border-primary/20 hover:border-primary/40 transition-colors"
        >
          <p className="text-sm font-medium text-foreground">
            {competitors.length} agências mapeadas — gerar análise comparativa
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            A matriz lado a lado foi substituída por síntese para decisão na aba Análise.
          </p>
        </Link>
      )}

      {competitors.length === 0 ? (
        <EmptyDeliverable
          title="Mapa ainda não disponível"
          message={
            busy
              ? "O worker está mapeando agências do nicho."
              : "Adicione seeds acima e enriqueça a análise."
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="hera-label">Cards por agência</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {competitors.map((c) => (
              <CompetitorCard key={c.id} competitor={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorCard({ competitor: c }: { competitor: Competitor }) {
  return (
    <div className="hera-card p-4 space-y-3 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{c.nome}</h3>
        {c.ticket_estimado && (
          <span className="text-[10px] text-primary font-medium shrink-0 max-w-[45%] text-right leading-snug">
            {c.ticket_estimado}
          </span>
        )}
      </div>

      {c.posicionamento && (
        <div>
          <p className="hera-label mb-1">Posicionamento</p>
          <p className="text-xs text-muted-foreground line-clamp-3">{c.posicionamento}</p>
        </div>
      )}

      {c.oferta && (
        <div>
          <p className="hera-label mb-1">Oferta</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{c.oferta}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-auto">
        {c.pontos_fortes && (
          <div className="text-[10px] rounded-md bg-hera-done/10 border border-hera-done/20 px-2 py-1.5">
            <span className="font-semibold text-hera-done">+ </span>
            <span className="text-muted-foreground line-clamp-3">{c.pontos_fortes}</span>
          </div>
        )}
        {c.pontos_fracos && (
          <div className="text-[10px] rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5">
            <span className="font-semibold text-destructive">− </span>
            <span className="text-muted-foreground line-clamp-3">{c.pontos_fracos}</span>
          </div>
        )}
      </div>

      {(c.url || c.instagram) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {c.url && (
            <a
              href={c.url.startsWith("http") ? c.url : `https://${c.url}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-primary hover:underline"
            >
              Site
            </a>
          )}
          {c.instagram && (
            <a
              href={
                c.instagram.startsWith("http")
                  ? c.instagram
                  : `https://${c.instagram.replace(/^\/+/, "")}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-primary hover:underline"
            >
              Instagram
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function EnrichCompetitorsPanel({
  operationId,
  busy,
  existingSeeds,
}: {
  operationId: string;
  busy: boolean;
  existingSeeds: ConcorrenteSeed[];
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  async function handleEnrich() {
    const added = parseSeedsFromText(text);
    if (added.length === 0) {
      toastWarning("Informe ao menos uma agência (uma por linha).");
      return;
    }

    setSubmitting(true);
    const merged = mergeSeeds(existingSeeds, added);

    const { error } = await supabase
      .from("operations")
      .update({
        concorrentes_seeds: merged,
        job_mode: "concorrencia",
        status: "queued",
        error: null,
        finished_at: null,
      })
      .eq("id", operationId);

    setSubmitting(false);

    if (error) {
      toastError(`Erro: ${error.message}`);
      return;
    }

    setText("");
    void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    void queryClient.invalidateQueries({ queryKey: ["phase_events", operationId] });
    void queryClient.invalidateQueries({ queryKey: ["competitors", operationId] });
  }

  return (
    <div className="hera-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Incrementar análise</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Cole URLs, Instagram ou nome da agência. O worker pesquisa e mescla com o mapa.
        </p>
      </div>

      {existingSeeds.length > 0 && (
        <div className="text-xs text-muted-foreground bg-accent/40 rounded-md px-3 py-2 font-mono whitespace-pre-wrap">
          <span className="font-medium text-foreground">Seeds: </span>
          {formatSeedsForTextarea(existingSeeds)}
        </div>
      )}

      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy || submitting}
        placeholder={"Agência X | https://site.com\ninstagram.com/amv.odonto"}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />

      <button
        type="button"
        onClick={() => void handleEnrich()}
        disabled={busy || submitting || !text.trim()}
        className="hera-btn-primary"
      >
        {(submitting || busy) && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Processando..." : "Enriquecer análise"}
      </button>
    </div>
  );
}

function EmptyDeliverable({ title, message }: { title: string; message: string }) {
  return (
    <div className="hera-card p-12 text-center space-y-3">
      <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
      <h3 className="font-serif text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{message}</p>
    </div>
  );
}
