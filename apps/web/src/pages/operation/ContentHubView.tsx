import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Loader2, Sparkles, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { asString, asStrings } from "@/lib/blueprint-types";
import {
  FORMAT_CONFIG,
  FUNIL_CONFIG,
  GENERATION_FORMATS,
  getFunilEtapa,
  type ContentFormat,
  type FunilEtapa,
} from "@/lib/content-formats";
import { ContentPieceCard, type ContentItemRow } from "@/components/content/ContentPieceCard";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Json } from "@/types/index";
import type { OperationContext } from "./operation-context";

function extractBlueprintIntel(sections: Record<string, Json>) {
  const mercado = sections.mercado_icp as Record<string, unknown> | undefined;
  const icp = (mercado?.icp ?? {}) as Record<string, unknown>;
  const pos = sections.posicionamento as Record<string, unknown> | undefined;
  const narrativa = (pos?.narrativa ?? {}) as Record<string, unknown>;
  const tf = sections.trafego_funil as Record<string, unknown> | undefined;

  const dores = asStrings(icp.dores);
  const angulos = Array.isArray(tf?.angulos_criativos)
    ? (tf!.angulos_criativos as unknown[]).slice(0, 4)
    : [];

  return {
    dores,
    icpQuem: asString(icp.quem_e),
    gatilho: asString(icp.situacao_gatilho),
    statement: asString(pos?.statement),
    heroi: asString(narrativa.heroi),
    problema: asString(narrativa.problema),
    guia: asString(narrativa.guia),
    angulos,
  };
}

export function ContentHubView() {
  const { operation, sections, operationId } = useOutletContext<OperationContext>();
  const queryClient = useQueryClient();
  const intel = useMemo(() => extractBlueprintIntel(sections), [sections]);

  const [selectedDores, setSelectedDores] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>([
    "carrossel_instagram",
    "post_estatico",
    "reels",
  ]);
  const [selectedFunil, setSelectedFunil] = useState<FunilEtapa[]>(["topo", "meio", "fundo"]);
  const [activeFunil, setActiveFunil] = useState<FunilEtapa | "all">("all");
  const [refiningItemId, setRefiningItemId] = useState<string | null>(null);

  useEffect(() => {
    if (intel.dores.length > 0 && selectedDores.length === 0) {
      setSelectedDores(intel.dores.slice(0, 3));
    }
  }, [intel.dores, selectedDores.length]);

  const isGenerating =
    (operation.status === "queued" || operation.status === "running") &&
    operation.job_mode === "content_generation";

  const prevStatusRef = useRef(operation.status);
  const pendingRefineRef = useRef<string | null>(null);
  const pendingGenerateRef = useRef(false);

  useEffect(() => {
    if (refiningItemId) pendingRefineRef.current = refiningItemId;
  }, [refiningItemId]);

  useEffect(() => {
    if (isGenerating) pendingGenerateRef.current = true;
  }, [isGenerating]);

  useEffect(() => {
    const statusChanged = prevStatusRef.current !== operation.status;
    prevStatusRef.current = operation.status;
    if (!statusChanged) return;

    if (operation.status === "done") {
      if (pendingRefineRef.current) {
        toastSuccess("Peça de conteúdo atualizada");
        pendingRefineRef.current = null;
        setRefiningItemId(null);
      } else if (pendingGenerateRef.current) {
        toastSuccess("Novas peças criativas prontas");
        pendingGenerateRef.current = false;
      }
      void queryClient.invalidateQueries({ queryKey: ["content_items", operationId] });
    } else if (operation.status === "error") {
      toastError(operation.error ?? "Job de conteúdo falhou");
      pendingRefineRef.current = null;
      pendingGenerateRef.current = false;
      setRefiningItemId(null);
    }
  }, [operation.status, operation.error, operationId, queryClient]);

  const { data: allItems = [], isLoading } = useQuery<ContentItemRow[]>({
    queryKey: ["content_items", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContentItemRow[];
    },
  });

  const stats = useMemo(() => {
    const byFunil = { topo: 0, meio: 0, fundo: 0 };
    for (const item of allItems) {
      const f = getFunilEtapa((item.content ?? {}) as Record<string, unknown>);
      byFunil[f]++;
    }
    return { total: allItems.length, ...byFunil };
  }, [allItems]);

  const displayedItems =
    activeFunil === "all"
      ? allItems
      : allItems.filter(
          (i) => getFunilEtapa((i.content ?? {}) as Record<string, unknown>) === activeFunil,
        );

  const pieceCount =
    selectedDores.length * selectedFormats.length * selectedFunil.length;

  const handleGenerate = useCallback(async () => {
    if (!selectedDores.length || !selectedFormats.length || !selectedFunil.length) return;

    const { error } = await supabase
      .from("operations")
      .update({
        job_mode: "content_generation",
        status: "queued",
        content_params: {
          mode: "generate",
          dores: selectedDores,
          formats: selectedFormats,
          funil_etapas: selectedFunil,
        },
        error: null,
        finished_at: null,
      })
      .eq("id", operationId);

    if (error) toastError(error.message);
    else void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
  }, [selectedDores, selectedFormats, selectedFunil, operationId, queryClient]);

  const handleRefineItem = useCallback(
    (itemId: string) => async (instruction: string) => {
      setRefiningItemId(itemId);
      const { error } = await supabase
        .from("operations")
        .update({
          job_mode: "content_generation",
          status: "queued",
          content_params: { mode: "refine", refine_item_id: itemId, instruction },
          error: null,
          finished_at: null,
        })
        .eq("id", operationId);
      if (error) {
        setRefiningItemId(null);
        throw new Error(error.message);
      }
      void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
    },
    [operationId, queryClient],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await supabase.from("content_items").delete().eq("id", id);
      void queryClient.invalidateQueries({ queryKey: ["content_items", operationId] });
    },
    [operationId, queryClient],
  );

  return (
    <div className="space-y-6 max-w-5xl hera-reveal-up">
      {/* Cockpit hero */}
      <div className="hera-cockpit-hero p-6 lg:p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="hera-label mb-1">Segundo cérebro criativo</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Motor de Conteúdo
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Blueprint (ICP, dores, narrativa, ângulos) → carrosséis, posts estáticos e Reels por
              etapa de funil — com ganchos contraintuitivos e foco em conversão.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Peças", value: stats.total },
            { label: "Topo", value: stats.topo },
            { label: "Meio", value: stats.meio },
            { label: "Fundo", value: stats.fundo },
            { label: "Dores ICP", value: intel.dores.length },
          ].map((s) => (
            <div key={s.label} className="hera-stat-tile text-center py-3">
              <p className="hera-mono text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Blueprint intel */}
      <div className="hera-card p-5 space-y-4">
        <p className="hera-label flex items-center gap-2">
          <Target className="h-3.5 w-3.5" />
          Insumos do Blueprint (obrigatórios na geração)
        </p>
        {intel.icpQuem ? (
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-bold text-primary uppercase mb-1">ICP</p>
              <p className="text-foreground/90">{intel.icpQuem}</p>
            </div>
            {intel.statement && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Statement</p>
                <p className="text-foreground/90 italic">&ldquo;{intel.statement}&rdquo;</p>
              </div>
            )}
            {intel.heroi && (
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Jornada do herói
                </p>
                <p className="text-xs text-muted-foreground">
                  Herói: {intel.heroi} · Problema: {intel.problema || "—"} · Guia: {intel.guia || "—"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Gere o Blueprint primeiro.</p>
        )}
        {intel.dores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {intel.dores.slice(0, 5).map((d, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full border border-destructive/30 bg-destructive/5 text-foreground max-w-xs truncate"
              >
                {i + 1}. {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Generator */}
      <div className="hera-card p-6 space-y-5">
        <p className="hera-label">Nova geração</p>

        {intel.dores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dores no Blueprint — impossível gerar.</p>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Dores a explorar</p>
              <div className="space-y-2">
                {intel.dores.map((dor, i) => (
                  <label
                    key={i}
                    className={[
                      "flex gap-3 rounded-lg border px-4 py-3 cursor-pointer min-h-[56px] items-start",
                      selectedDores.includes(dor) ? "border-primary/40 bg-primary/5" : "border-border",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-primary"
                      checked={selectedDores.includes(dor)}
                      onChange={() =>
                        setSelectedDores((p) =>
                          p.includes(dor) ? p.filter((x) => x !== dor) : [...p, dor],
                        )
                      }
                    />
                    <span className="text-sm">{dor}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Formatos</p>
              <div className="flex flex-wrap gap-2">
                {GENERATION_FORMATS.map((fmt) => {
                  const cfg = FORMAT_CONFIG[fmt];
                  const Icon = cfg.icon;
                  const on = selectedFormats.includes(fmt);
                  return (
                    <label
                      key={fmt}
                      className={[
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm",
                        on ? "border-primary/40 bg-primary/5" : "border-border",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={on}
                        onChange={() =>
                          setSelectedFormats((p) =>
                            p.includes(fmt) ? p.filter((x) => x !== fmt) : [...p, fmt],
                          )
                        }
                      />
                      <Icon className={`h-4 w-4 ${on ? cfg.color : ""}`} />
                      {cfg.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Etapas de funil</p>
              <div className="flex flex-wrap gap-2">
                {(["topo", "meio", "fundo"] as FunilEtapa[]).map((f) => {
                  const cfg = FUNIL_CONFIG[f];
                  const on = selectedFunil.includes(f);
                  return (
                    <label
                      key={f}
                      className={[
                        "flex flex-col px-4 py-2 rounded-lg border cursor-pointer min-w-[100px]",
                        on ? "border-primary/40 bg-primary/5" : "border-border",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={on}
                          onChange={() =>
                            setSelectedFunil((p) =>
                              p.includes(f) ? p.filter((x) => x !== f) : [...p, f],
                            )
                          }
                        />
                        {cfg.short}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 pl-6">{cfg.desc}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="hera-mono font-bold text-foreground">{pieceCount}</span> peças
                (dor × formato × funil)
              </p>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isGenerating || pieceCount === 0}
                className="hera-btn-primary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar peças
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Gallery */}
      {(isLoading || allItems.length > 0) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="hera-label">Peças criativas</p>
            <div className="flex flex-wrap gap-1.5">
              <FunilPill label="Todas" active={activeFunil === "all"} onClick={() => setActiveFunil("all")} />
              {(["topo", "meio", "fundo"] as FunilEtapa[]).map((f) => (
                <FunilPill
                  key={f}
                  label={FUNIL_CONFIG[f].short}
                  active={activeFunil === f}
                  onClick={() => setActiveFunil(f)}
                />
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayedItems.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">Nenhuma peça neste funil.</p>
          ) : (
            <div className="space-y-4">
              {displayedItems.map((item) => (
                <ContentPieceCard
                  key={item.id}
                  item={item}
                  onRefine={handleRefineItem(item.id)}
                  isRefining={refiningItemId === item.id && isGenerating}
                  onDelete={() => void handleDelete(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && allItems.length === 0 && !isGenerating && (
        <div className="hera-card p-12 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium">Nenhuma peça ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione dores, formatos e funil — o motor usa todo o Blueprint como contexto.
          </p>
        </div>
      )}
    </div>
  );
}

function FunilPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-[11px] font-medium px-3 py-1 rounded-full border transition-colors",
        active ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
