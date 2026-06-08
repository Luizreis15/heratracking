import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { competitorLabels, resolveOperadorTipo } from "@/lib/operador-tipo";
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
  const { operation, competitors, operationId } = useOutletContext<OperationContext>();
  const queryClient = useQueryClient();
  const existingSeeds = parseSeedsFromJson(operation.concorrentes_seeds);
  const tipo = resolveOperadorTipo(operation);
  const labels = competitorLabels(tipo);
  const [fixingTipo, setFixingTipo] = useState(false);

  async function setOperadorSaas() {
    setFixingTipo(true);
    const { error } = await supabase
      .from("operations")
      .update({
        operador_tipo: "saas_b2b",
        status: "done",
        error: null,
        job_mode: "full",
      })
      .eq("id", operationId);
    setFixingTipo(false);
    if (error) {
      toastError(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
  }

  const busy =
    (operation.status === "queued" || operation.status === "running") &&
    operation.job_mode === "concorrencia";

  const hasError = operation.status === "error" && Boolean(operation.error);

  return (
    <div className="space-y-6">
      <div>
        <p className="hera-label mb-1">Radar competitivo</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{labels.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tipo === "saas_b2b"
            ? "Plataformas e soluções que competem pelo mesmo ICP. Para síntese estratégica, use "
            : "Dados brutos no banco — ticket, oferta, posicionamento. Para decisões estratégicas, use "}
          <Link to={`/operations/${operation.id}/analise`} className="text-primary hover:underline">
            Análise →
          </Link>
        </p>
        {tipo === "saas_b2b" ? (
          <p className="text-xs text-primary/90 mt-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
            Modo <strong>SaaS B2B</strong>: o operador é uma plataforma que vende para empresas.
            Concorrentes aqui são <strong>outros softwares</strong>, não agências de marketing.
          </p>
        ) : (
          <div className="text-xs mt-2 bg-accent/50 border border-border rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              Operando como <strong>agência</strong>. Se o operador é um SaaS (ex.: Veramo), mude o tipo.
            </span>
            <button
              type="button"
              disabled={fixingTipo}
              onClick={() => void setOperadorSaas()}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {fixingTipo ? "Salvando..." : "Mudar para SaaS B2B"}
            </button>
          </div>
        )}
      </div>

      {hasError && (
        <div className="flex items-start gap-3 hera-card px-4 py-3 border-destructive/40 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Último job falhou</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{operation.error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Você pode enriquecer novamente abaixo — o erro será limpo ao reenfileirar.
            </p>
          </div>
        </div>
      )}

      <EnrichCompetitorsPanel
        operationId={operation.id}
        busy={busy}
        existingSeeds={existingSeeds}
        tipo={tipo}
      />

      {busy && (
        <div className="flex items-center gap-3 hera-card px-4 py-3 border-hera-running/30">
          <Loader2 className="h-5 w-5 text-hera-running animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Pesquisando {tipo === "saas_b2b" ? "players" : "concorrentes"} na web
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pode levar 1–3 minutos. Os cards atualizam automaticamente.
            </p>
          </div>
        </div>
      )}

      {competitors.length > 0 && (
        <Link
          to={`/operations/${operation.id}/analise`}
          className="hera-card block p-4 border-primary/20 hover:border-primary/40 transition-colors"
        >
          <p className="text-sm font-medium text-foreground">
            {competitors.length} {labels.mapped} — gerar análise comparativa
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Síntese para decisão na aba Análise.
          </p>
        </Link>
      )}

      {competitors.length === 0 ? (
        <EmptyDeliverable
          title="Mapa ainda não disponível"
          message={
            busy
              ? `O worker está mapeando ${tipo === "saas_b2b" ? "players" : "agências"} do nicho.`
              : "Adicione seeds acima e enriqueça a análise."
          }
        />
      ) : (
        <div className="space-y-3">
          {competitors.map((c) => (
            <CompetitorCard key={c.id} competitor={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitorCard({ competitor: c }: { competitor: Competitor }) {
  return (
    <div className="hera-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-foreground">{c.nome}</h3>
        {c.ticket_estimado && (
          <span className="text-xs text-muted-foreground shrink-0">{c.ticket_estimado}</span>
        )}
      </div>
      {c.posicionamento && (
        <p className="text-sm text-muted-foreground">{c.posicionamento}</p>
      )}
      {c.oferta && <p className="text-sm">{c.oferta}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {c.url && (
          <a href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Site
          </a>
        )}
        {c.instagram && (
          <a href={c.instagram} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Instagram
          </a>
        )}
        {c.fonte && <span>Fonte: {c.fonte}</span>}
      </div>
    </div>
  );
}

function EnrichCompetitorsPanel({
  operationId,
  busy,
  existingSeeds,
  tipo,
}: {
  operationId: string;
  busy: boolean;
  existingSeeds: ConcorrenteSeed[];
  tipo: ReturnType<typeof resolveOperadorTipo>;
}) {
  const labels = competitorLabels(tipo);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  async function handleEnrich() {
    const added = parseSeedsFromText(text);
    if (added.length === 0) {
      toastWarning(labels.enrichToast);
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
          Cole URLs, Instagram ou nome. O worker pesquisa e mescla com o mapa. {labels.seedHint}
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
        placeholder={labels.seedPlaceholder}
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
    <div className="hera-card p-8 text-center space-y-2">
      <Users className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
