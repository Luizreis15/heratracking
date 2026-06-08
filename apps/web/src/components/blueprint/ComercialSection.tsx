import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Json } from "@/types/index";
import { asString, asStrings, type ComercialData } from "@/lib/blueprint-types";

function toStrings(val: unknown): string[] {
  if (Array.isArray(val)) return asStrings(val);
  if (typeof val === "string") return [val];
  return [];
}

function parseFunilStep(item: unknown, i: number): { etapa: string; detalhe: string } {
  if (typeof item === "string") {
    const parts = item.split(" — ");
    return { etapa: parts[0]?.trim() ?? item, detalhe: parts.slice(1).join(" — ").trim() };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    return {
      etapa: asString(obj.etapa ?? obj.nome ?? `Etapa ${i + 1}`),
      detalhe: asString(obj.responsavel ?? obj.descricao ?? obj.sla ?? ""),
    };
  }
  return { etapa: `Etapa ${i + 1}`, detalhe: String(item) };
}

function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hera-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  );
}

export function ComercialSection({ data }: { data: Json }) {
  const d = (data ?? {}) as ComercialData;
  const funilSteps = Array.isArray(d.funil_comercial) ? d.funil_comercial : [];
  const sdrCriterios = toStrings(d.sdr?.criterios);
  const sdrScripts = toStrings(d.sdr?.scripts);
  const closerRoteiro = toStrings(d.closer?.roteiro_call);
  const closerPerguntas = toStrings(d.closer?.perguntas);

  return (
    <div className="space-y-8 pt-2">

      {/* Funil Comercial — timeline */}
      {funilSteps.length > 0 && (
        <div>
          <p className="hera-label mb-4">Funil Comercial</p>
          <div className="relative pl-5">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {funilSteps.map((item, i) => {
                const step = parseFunilStep(item, i);
                return (
                  <div key={i} className="relative flex gap-4 items-start">
                    <div className="absolute -left-5 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="hera-card px-3 py-2.5 flex-1">
                      <p className="text-sm font-semibold text-foreground">{step.etapa}</p>
                      {step.detalhe && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.detalhe}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SDR */}
      {(sdrCriterios.length > 0 || sdrScripts.length > 0) && (
        <div>
          <p className="hera-label mb-3">SDR — Qualificação de Leads</p>
          <div className="space-y-3">
            {sdrCriterios.length > 0 && (
              <div className="hera-card p-4">
                <p className="text-xs font-semibold text-foreground mb-2">
                  Critérios de qualificação
                </p>
                <ul className="space-y-1.5">
                  {sdrCriterios.map((c, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-foreground">
                      <span className="text-primary shrink-0 mt-1 text-xs">·</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sdrScripts.map((script, i) => (
              <Accordion key={i} title={`Script SDR ${sdrScripts.length > 1 ? i + 1 : ""}`.trim()}>
                {script}
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {/* Closer */}
      {(closerRoteiro.length > 0 || closerPerguntas.length > 0) && (
        <div>
          <p className="hera-label mb-3">Closer — Roteiro de Call</p>
          <div className="space-y-3">
            {closerRoteiro.length > 0 && (
              <div className="space-y-2">
                {closerRoteiro.map((etapa, i) => (
                  <div key={i} className="flex gap-3 hera-card px-4 py-3 items-start">
                    <span className="text-xs font-bold text-primary shrink-0 mt-0.5 font-mono">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{etapa}</p>
                  </div>
                ))}
              </div>
            )}
            {closerPerguntas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 mt-4">
                  Perguntas-chave na call
                </p>
                <div className="space-y-2">
                  {closerPerguntas.map((q, i) => (
                    <div
                      key={i}
                      className="hera-card px-3 py-2.5 border-l-[3px] border-l-primary/50"
                    >
                      <p className="text-sm text-foreground italic">&ldquo;{q}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carta de Vendas */}
      {d.carta_vendas && (
        <Accordion title="Carta de Vendas">
          {asString(d.carta_vendas)}
        </Accordion>
      )}

      {/* Pitch Stacking */}
      {d.pitch_stacking && (
        <Accordion title="Value Stacking — Pitch de Fechamento">
          {asString(d.pitch_stacking)}
        </Accordion>
      )}
    </div>
  );
}
