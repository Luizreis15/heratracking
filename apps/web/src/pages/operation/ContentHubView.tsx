import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Check,
  Loader2,
  Sparkles,
  Instagram,
  Play,
  Mail,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { asStrings } from "@/lib/blueprint-types";
import type { Json } from "@/types/index";
import type { OperationContext } from "./operation-context";

type ContentFormat = "post_instagram" | "script_reels" | "email_prospeccao";

type ContentItem = {
  id: string;
  format: string;
  dor: string | null;
  content: Json;
  created_at: string;
};

const FORMAT_CONFIG: Record<
  ContentFormat,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  post_instagram: { label: "Post Instagram", icon: Instagram, color: "text-pink-500" },
  script_reels: { label: "Script Reels", icon: Play, color: "text-violet-500" },
  email_prospeccao: { label: "Email Prospecção B2B", icon: Mail, color: "text-hera-running" },
};

function s(val: unknown): string {
  if (typeof val === "string") return val;
  if (val == null) return "";
  return String(val);
}

function extractDores(sections: Record<string, Json>): string[] {
  const icp = sections.mercado_icp;
  if (!icp || typeof icp !== "object" || Array.isArray(icp)) return [];
  const obj = icp as Record<string, unknown>;
  const icpData = obj.icp as Record<string, unknown> | undefined;
  if (!icpData) return [];
  return asStrings(icpData.dores);
}

function extractAngulos(sections: Record<string, Json>) {
  const tf = sections.trafego_funil;
  if (!tf || typeof tf !== "object" || Array.isArray(tf)) return [];
  const obj = tf as Record<string, unknown>;
  if (!Array.isArray(obj.angulos_criativos)) return [];
  return (obj.angulos_criativos as unknown[]).slice(0, 5).map((a) => {
    if (typeof a === "string") return { gancho: a };
    if (a && typeof a === "object") return a as Record<string, string>;
    return {};
  });
}

// ─── Copy Button ───────────────────────────────────────────────────────────────
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar"
      className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
        copied
          ? "border-hera-done/40 text-hera-done bg-hera-done/10"
          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
      } ${className}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

// ─── Content Cards ─────────────────────────────────────────────────────────────
function PostInstagramCard({ item }: { item: ContentItem }) {
  const c = (item.content ?? {}) as Record<string, unknown>;
  const hashtags = Array.isArray(c.hashtags) ? (c.hashtags as string[]) : [];
  const fullText = [s(c.titulo), s(c.corpo), s(c.cta), hashtags.join(" ")].filter(Boolean).join("\n\n");

  return (
    <div className="hera-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.dor && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Dor: {item.dor}
            </p>
          )}
          {s(c.titulo) && (
            <p className="text-sm font-semibold text-foreground leading-snug">{s(c.titulo)}</p>
          )}
        </div>
        <CopyButton text={fullText} className="shrink-0" />
      </div>
      {s(c.corpo) && (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {s(c.corpo)}
        </p>
      )}
      {s(c.cta) && (
        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] font-semibold text-hera-done uppercase tracking-wide mb-1">CTA</p>
          <p className="text-sm text-foreground">{s(c.cta)}</p>
        </div>
      )}
      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hashtags.slice(0, 12).map((h, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ScriptReelsCard({ item }: { item: ContentItem }) {
  const c = (item.content ?? {}) as Record<string, unknown>;
  const fullText = [
    s(c.hook) && `🎬 Hook (3s): ${s(c.hook)}`,
    s(c.desenvolvimento) && `📝 Desenvolvimento:\n${s(c.desenvolvimento)}`,
    s(c.cta) && `👉 CTA: ${s(c.cta)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="hera-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.dor && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Dor: {item.dor}
            </p>
          )}
          {s(c.duracao_seg) && (
            <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
              ~{s(c.duracao_seg)}s
            </span>
          )}
        </div>
        <CopyButton text={fullText} className="shrink-0" />
      </div>
      {s(c.hook) && (
        <div>
          <p className="text-[10px] font-semibold text-hera-alert uppercase tracking-wide mb-1">
            Hook — primeiros 3 segundos
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">{s(c.hook)}</p>
        </div>
      )}
      {s(c.desenvolvimento) && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Desenvolvimento
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {s(c.desenvolvimento)}
          </p>
        </div>
      )}
      {s(c.cta) && (
        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] font-semibold text-hera-done uppercase tracking-wide mb-1">CTA Final</p>
          <p className="text-sm text-foreground">{s(c.cta)}</p>
        </div>
      )}
    </div>
  );
}

function EmailCard({ item }: { item: ContentItem }) {
  const c = (item.content ?? {}) as Record<string, unknown>;
  const [expanded, setExpanded] = useState(false);
  const corpo = c.corpo ? String(c.corpo) : "";
  const preview = corpo.slice(0, 180) + (corpo.length > 180 ? "..." : "");
  const fullText = [
    s(c.assunto) && `Assunto: ${s(c.assunto)}`,
    corpo,
    s(c.cta) && `CTA: ${s(c.cta)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="hera-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {item.dor && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Dor: {item.dor}
            </p>
          )}
          {s(c.assunto) && (
            <p className="text-sm font-semibold text-foreground leading-snug truncate">
              {s(c.assunto)}
            </p>
          )}
        </div>
        <CopyButton text={fullText} className="shrink-0" />
      </div>
      {corpo && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Corpo
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {expanded ? corpo : preview}
          </p>
          {corpo.length > 180 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[11px] text-primary mt-1.5 hover:underline"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Recolher" : "Ver tudo"}
            </button>
          )}
        </div>
      )}
      {s(c.cta) && (
        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] font-semibold text-hera-done uppercase tracking-wide mb-1">
            Próximo passo
          </p>
          <p className="text-sm text-foreground">{s(c.cta)}</p>
        </div>
      )}
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  if (item.format === "post_instagram") return <PostInstagramCard item={item} />;
  if (item.format === "script_reels") return <ScriptReelsCard item={item} />;
  if (item.format === "email_prospeccao") return <EmailCard item={item} />;
  return null;
}

// ─── Main View ─────────────────────────────────────────────────────────────────
export function ContentHubView() {
  const { operation, sections, operationId } = useOutletContext<OperationContext>();
  const queryClient = useQueryClient();

  const dores = useMemo(() => extractDores(sections), [sections]);
  const angulos = useMemo(() => extractAngulos(sections), [sections]);

  const [selectedDores, setSelectedDores] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>([
    "post_instagram",
    "script_reels",
    "email_prospeccao",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ContentFormat | "all">("all");

  // Pre-select top 2 dores once blueprint loads
  useEffect(() => {
    if (dores.length > 0 && selectedDores.length === 0) {
      setSelectedDores(dores.slice(0, 2));
    }
  }, [dores, selectedDores.length]);

  // Clear generating state when operation finishes
  useEffect(() => {
    if (operation.status === "done" && isGenerating) {
      setIsGenerating(false);
      void queryClient.invalidateQueries({ queryKey: ["content_items", operationId] });
    }
  }, [operation.status, isGenerating, operationId, queryClient]);

  const { data: allItems = [], isLoading: itemsLoading } = useQuery<ContentItem[]>({
    queryKey: ["content_items", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContentItem[];
    },
  });

  const handleGenerate = useCallback(async () => {
    if (!selectedDores.length || !selectedFormats.length) return;
    setIsGenerating(true);

    const { error } = await supabase
      .from("operations")
      .update({
        job_mode: "content_generation",
        status: "queued",
        content_params: { dores: selectedDores, formats: selectedFormats, angulos },
        error: null,
        finished_at: null,
      })
      .eq("id", operationId);

    if (error) {
      setIsGenerating(false);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["operation", operationId] });
  }, [selectedDores, selectedFormats, angulos, operationId, queryClient]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    await supabase.from("content_items").delete().eq("id", itemId);
    void queryClient.invalidateQueries({ queryKey: ["content_items", operationId] });
  }, [operationId, queryClient]);

  function toggleDor(dor: string) {
    setSelectedDores((prev) =>
      prev.includes(dor) ? prev.filter((d) => d !== dor) : [...prev, dor],
    );
  }
  function toggleFormat(f: ContentFormat) {
    setSelectedFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  const displayedItems =
    activeFormat === "all" ? allItems : allItems.filter((i) => i.format === activeFormat);

  const isBusy =
    isGenerating ||
    ((operation.status === "queued" || operation.status === "running") &&
      operation.job_mode === "content_generation");

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <p className="hera-label mb-1">Geração de Conteúdo</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Hub de Conteúdo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dores do ICP + ângulos criativos do Blueprint → posts, Reels e emails prontos para usar.
        </p>
      </div>

      {/* Generator Panel */}
      <div className="hera-card p-6 space-y-6">
        {/* Dores */}
        {dores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Gere o Blueprint primeiro para extrair as dores do ICP.
          </p>
        ) : (
          <div>
            <p className="hera-label mb-3">
              Dores prioritárias{" "}
              <span className="normal-case font-normal text-muted-foreground">
                (selecione as que quer usar)
              </span>
            </p>
            <div className="space-y-2">
              {dores.slice(0, 5).map((dor, i) => (
                <label
                  key={i}
                  className={[
                    "flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                    selectedDores.includes(dor)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-border/80",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={selectedDores.includes(dor)}
                    onChange={() => toggleDor(dor)}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    {i === 0 && (
                      <span className="text-[9px] font-bold text-destructive uppercase tracking-wide mr-2">
                        #1 dor crítica
                      </span>
                    )}
                    <span className="text-sm text-foreground leading-snug">{dor}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Formatos */}
        <div>
          <p className="hera-label mb-3">Formatos</p>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(FORMAT_CONFIG) as [ContentFormat, (typeof FORMAT_CONFIG)[ContentFormat]][]).map(
              ([fmt, cfg]) => {
                const Icon = cfg.icon;
                const checked = selectedFormats.includes(fmt);
                return (
                  <label
                    key={fmt}
                    className={[
                      "flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors text-sm font-medium",
                      checked
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-border/80",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFormat(fmt)}
                      className="accent-primary"
                    />
                    <Icon className={`h-4 w-4 ${checked ? cfg.color : ""}`} />
                    {cfg.label}
                  </label>
                );
              },
            )}
          </div>
        </div>

        {/* Generate button */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground">
            {selectedDores.length} dores × {selectedFormats.length} formatos ={" "}
            <span className="font-semibold text-foreground">
              {selectedDores.length * selectedFormats.length} peças
            </span>{" "}
            a gerar
          </p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isBusy || selectedDores.length === 0 || selectedFormats.length === 0}
            className="hera-btn-primary flex items-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Conteúdo
              </>
            )}
          </button>
        </div>

        {isBusy && (
          <div className="flex items-center gap-3 text-sm text-hera-running">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <p>Worker gerando conteúdo — pode fechar a aba, o job continua rodando.</p>
          </div>
        )}
      </div>

      {/* Results */}
      {(itemsLoading || allItems.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="hera-label">Conteúdo Gerado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allItems.length} peça{allItems.length !== 1 ? "s" : ""} •{" "}
                clique em Copiar para usar
              </p>
            </div>

            {/* Format filter */}
            <div className="flex gap-1.5">
              <FilterPill
                label="Todos"
                active={activeFormat === "all"}
                onClick={() => setActiveFormat("all")}
              />
              {(["post_instagram", "script_reels", "email_prospeccao"] as ContentFormat[]).map(
                (f) =>
                  allItems.some((i) => i.format === f) ? (
                    <FilterPill
                      key={f}
                      label={FORMAT_CONFIG[f].label.split(" ")[0]!}
                      active={activeFormat === f}
                      onClick={() => setActiveFormat(f)}
                    />
                  ) : null,
              )}
            </div>
          </div>

          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {displayedItems.map((item) => (
                <div key={item.id} className="group relative">
                  <div className="flex items-center gap-2 mb-2">
                    {FORMAT_CONFIG[item.format as ContentFormat] && (
                      <>
                        {(() => {
                          const cfg = FORMAT_CONFIG[item.format as ContentFormat];
                          const Icon = cfg.icon;
                          return (
                            <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(item.id)}
                      title="Excluir"
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ContentCard item={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!itemsLoading && allItems.length === 0 && !isBusy && (
        <div className="hera-card p-10 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-foreground">Nenhum conteúdo gerado ainda</p>
          <p className="text-xs text-muted-foreground">
            Selecione as dores e formatos acima e clique em Gerar Conteúdo.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterPill({
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
        "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
