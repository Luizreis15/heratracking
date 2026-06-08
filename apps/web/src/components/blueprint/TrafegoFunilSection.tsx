import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type AngloCriativo, type TrafegoFunilData } from "@/lib/blueprint-types";

function parseAngulo(item: unknown, i: number): AngloCriativo & { index: number } {
  if (typeof item === "string") {
    // "Gancho: X | Corpo: Y | CTA: Z"
    const gancho = item.match(/gancho[:\s]+([^|]+)/i)?.[1]?.trim();
    const corpo = item.match(/corpo[:\s]+([^|]+)/i)?.[1]?.trim();
    const cta = item.match(/cta[:\s]+(.+)/i)?.[1]?.trim();
    if (gancho || corpo) {
      return { index: i, gancho, corpo, cta };
    }
    return { index: i, gancho: item, titulo: item };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return { index: i, ...(item as AngloCriativo) };
  }
  return { index: i, gancho: String(item) };
}

function parseFunilItem(item: unknown, i: number): { etapa: string; peca: string; metrica: string } {
  if (typeof item === "string") {
    const parts = item.split("|").map((s) => s.trim());
    return {
      etapa: parts[0] ?? `Etapa ${i + 1}`,
      peca: parts[1] ?? "",
      metrica: parts[2] ?? "",
    };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    return {
      etapa: asString(obj.etapa ?? obj.nome ?? `Etapa ${i + 1}`),
      peca: asString(obj.peca ?? obj.descricao ?? ""),
      metrica: asString(obj.metrica ?? obj.kpi ?? ""),
    };
  }
  return { etapa: `Etapa ${i + 1}`, peca: String(item), metrica: "" };
}

function CopyButton({ text }: { text: string }) {
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
      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-hera-done" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function AnguloCard({ angulo, i }: { angulo: AngloCriativo & { index: number }; i: number }) {

  const fullText = [
    angulo.gancho && `🎯 Gancho: ${angulo.gancho}`,
    angulo.corpo && `📝 Corpo: ${angulo.corpo}`,
    angulo.cta && `👉 CTA: ${angulo.cta}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="hera-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Ângulo {i + 1}
        </span>
        {fullText && <CopyButton text={fullText} />}
      </div>

      {angulo.gancho && (
        <div>
          <p className="text-[10px] font-semibold text-hera-alert uppercase tracking-wide mb-1">
            Gancho
          </p>
          <p className="text-sm font-medium text-foreground leading-snug">{angulo.gancho}</p>
        </div>
      )}

      {angulo.corpo && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Desenvolvimento
          </p>
          <p className="text-sm text-foreground leading-relaxed">{angulo.corpo}</p>
        </div>
      )}

      {angulo.cta && (
        <div className="pt-2 border-t border-border/40">
          <p className="text-[10px] font-semibold text-hera-done uppercase tracking-wide mb-1">
            CTA
          </p>
          <p className="text-sm text-foreground">{angulo.cta}</p>
        </div>
      )}

      {/* Fallback: texto puro sem estrutura gancho/corpo/cta */}
      {!angulo.gancho && !angulo.corpo && angulo.titulo && (
        <p className="text-sm text-foreground leading-relaxed">{angulo.titulo}</p>
      )}
    </div>
  );
}

export function TrafegoFunilSection({ data }: { data: Json }) {
  const d = (data ?? {}) as TrafegoFunilData;
  const mapaFunil = Array.isArray(d.mapa_funil) ? d.mapa_funil : [];
  const jornada = Array.isArray(d.jornada_cliente) ? d.jornada_cliente : [];
  const campanhas = Array.isArray(d.campanhas) ? d.campanhas : [];
  const angulos = Array.isArray(d.angulos_criativos) ? d.angulos_criativos : [];
  const mens = d.mensuracao ?? {};
  const kpis = asStrings(mens.kpis);

  return (
    <div className="space-y-8 pt-2">

      {/* Mapa do Funil */}
      {mapaFunil.length > 0 && (
        <div>
          <p className="hera-label mb-4">Mapa do Funil de Aquisição</p>
          <div className="space-y-2">
            {mapaFunil.map((item, i) => {
              const step = parseFunilItem(item, i);
              const isTop = i === 0;
              return (
                <div
                  key={i}
                  className={[
                    "hera-card px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-4 items-center",
                    isTop ? "border-primary/30" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={[
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                        isTop
                          ? "border-primary/40 text-primary"
                          : i === 1
                            ? "border-hera-running/40 text-hera-running"
                            : "border-hera-done/40 text-hera-done",
                      ].join(" ")}
                    >
                      {isTop ? "TOPO" : i === mapaFunil.length - 1 ? "FUNDO" : "MEIO"}
                    </span>
                    <p className="text-sm font-medium text-foreground truncate">{step.etapa}</p>
                  </div>
                  {step.peca && (
                    <p className="text-xs text-muted-foreground truncate">{step.peca}</p>
                  )}
                  {step.metrica && (
                    <p className="text-xs text-primary font-medium">{step.metrica}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ângulos Criativos — coração do conteúdo */}
      {angulos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="hera-label">
              Ângulos Criativos{" "}
              <span className="normal-case font-normal text-muted-foreground">
                ({angulos.length}) — use como gancho de post, Reels e anúncio
              </span>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {angulos.map((item, i) => {
              const angulo = parseAngulo(item, i);
              return <AnguloCard key={i} angulo={angulo} i={i} />;
            })}
          </div>
        </div>
      )}

      {/* Jornada do Cliente */}
      {jornada.length > 0 && (
        <div>
          <p className="hera-label mb-4">Jornada do Cliente</p>
          <div className="relative pl-5">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-3">
              {jornada.map((item, i) => {
                const step = parseFunilItem(item, i);
                return (
                  <div key={i} className="relative flex gap-4 items-start">
                    <div className="absolute -left-5 h-4 w-4 rounded-full border-2 border-primary bg-background shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{step.etapa}</p>
                      {step.peca && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.peca}</p>
                      )}
                      {step.metrica && (
                        <p className="text-[11px] text-destructive/70 mt-0.5">
                          Vazamento: {step.metrica}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Campanhas */}
      {campanhas.length > 0 && (
        <div>
          <p className="hera-label mb-3">Estrutura de Campanhas</p>
          <div className="space-y-2">
            {campanhas.map((item, i) => {
              const c = parseFunilItem(item, i);
              return (
                <div key={i} className="hera-card px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{c.etapa}</p>
                  {c.peca && <p className="text-xs text-muted-foreground mt-0.5">{c.peca}</p>}
                  {c.metrica && (
                    <p className="text-xs text-primary mt-0.5 font-medium">{c.metrica}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensuração */}
      {(kpis.length > 0 || mens.tracking || mens.ritual) && (
        <div>
          <p className="hera-label mb-3">Mensuração e Gestão</p>
          <div className="hera-card p-5 space-y-4">
            {kpis.length > 0 && (
              <div>
                <p className="hera-label mb-2">KPIs por Etapa</p>
                <div className="flex flex-wrap gap-2">
                  {kpis.map((kpi, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full border border-border bg-accent/30 text-foreground"
                    >
                      {kpi}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {mens.tracking && (
              <div>
                <p className="hera-label mb-1.5">Tracking / Atribuição</p>
                <p className="text-sm text-foreground">{asString(mens.tracking)}</p>
              </div>
            )}
            {mens.ritual && (
              <div>
                <p className="hera-label mb-1.5">Ritual de Gestão</p>
                <p className="text-sm text-foreground leading-relaxed">{asString(mens.ritual)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
