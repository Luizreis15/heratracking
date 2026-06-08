import type { Json } from "@/types/index";
import { asString, asStrings, type EscadaDegrau, type OfertaEscadaData } from "@/lib/blueprint-types";

function parseDegrau(item: unknown, i: number): { label: string; descricao: string; preco: string } {
  if (typeof item === "string") {
    // "Core: Gestão de tráfego + assessoria (R$ 3.000/mês)" → parse
    const colonIdx = item.indexOf(":");
    if (colonIdx > 0) {
      return {
        label: item.slice(0, colonIdx).trim(),
        descricao: item.slice(colonIdx + 1).trim(),
        preco: "",
      };
    }
    return { label: `Degrau ${i + 1}`, descricao: item, preco: "" };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const d = item as EscadaDegrau;
    return {
      label: d.nome ?? d.tipo ?? `Degrau ${i + 1}`,
      descricao: d.descricao ?? "",
      preco: d.preco ?? "",
    };
  }
  return { label: `Degrau ${i + 1}`, descricao: String(item), preco: "" };
}

const DEGRAU_COLORS = [
  "border-border bg-muted/30",
  "border-hera-running/30 bg-hera-running/5",
  "border-primary/40 bg-primary/8",
  "border-primary/60 bg-primary/12",
];

export function OfertaEscadaSection({ data }: { data: Json }) {
  const d = (data ?? {}) as OfertaEscadaData;
  const escada = Array.isArray(d.escada) ? d.escada : [];
  const op = d.oferta_principal ?? {};
  const inclusos = asStrings(op.inclusos);
  const bonus = asStrings(op.bonus);

  return (
    <div className="space-y-8 pt-2">

      {/* Equação de Valor */}
      {d.equacao_valor && (
        <div className="hera-card p-4 border-primary/25 bg-primary/5">
          <p className="hera-label mb-2">Equação de Valor</p>
          <p className="text-sm text-foreground leading-relaxed font-medium">
            {asString(d.equacao_valor)}
          </p>
        </div>
      )}

      {/* Escada de Valor — visual ascendente */}
      {escada.length > 0 && (
        <div>
          <p className="hera-label mb-4">Escada de Valor</p>
          <div className="space-y-2">
            {escada.map((item, i) => {
              const degrau = parseDegrau(item, i);
              const isTop = i === escada.length - 1;
              const colorClass = DEGRAU_COLORS[Math.min(i, DEGRAU_COLORS.length - 1)];
              const leftPad = `${i * 16}px`;
              return (
                <div
                  key={i}
                  style={{ marginLeft: leftPad }}
                  className={`rounded-lg border px-4 py-3 transition-all ${colorClass} ${isTop ? "border-primary ring-1 ring-primary/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isTop ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {degrau.label}
                      </p>
                      {degrau.descricao && (
                        <p className="text-sm text-foreground leading-relaxed">
                          {degrau.descricao}
                        </p>
                      )}
                    </div>
                    {degrau.preco && (
                      <span
                        className={`text-xs font-bold shrink-0 ${isTop ? "text-primary" : "text-foreground"}`}
                      >
                        {degrau.preco}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {escada.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              Oferta principal = degrau mais alto — onde o cliente deve chegar.
            </p>
          )}
        </div>
      )}

      {/* Oferta Principal */}
      {(op.promessa || op.mecanismo_unico || inclusos.length > 0) && (
        <div>
          <p className="hera-label mb-3">Oferta Principal</p>
          <div className="hera-card p-5 space-y-4">
            {op.promessa && (
              <div>
                <p className="hera-label mb-1.5">Promessa</p>
                <p className="text-base font-semibold text-foreground leading-snug">
                  {op.promessa}
                </p>
              </div>
            )}
            {op.mecanismo_unico && (
              <div>
                <p className="hera-label mb-1.5">Mecanismo Único</p>
                <p className="text-sm text-foreground leading-relaxed">{op.mecanismo_unico}</p>
              </div>
            )}
            {inclusos.length > 0 && (
              <div>
                <p className="hera-label mb-2">O que está incluso</p>
                <ul className="space-y-1.5">
                  {inclusos.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-hera-done font-bold text-sm shrink-0">✓</span>
                      <span className="text-sm text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
              {op.garantia && (
                <MiniBlock label="Garantia" value={op.garantia} accent="done" />
              )}
              {op.escassez && (
                <MiniBlock label="Escassez" value={op.escassez} accent="alert" />
              )}
            </div>
            {bonus.length > 0 && (
              <div>
                <p className="hera-label mb-2">Bônus</p>
                <div className="flex flex-wrap gap-2">
                  {bonus.map((b, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary"
                    >
                      + {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Precificação */}
      {d.precificacao && (
        <div>
          <p className="hera-label mb-2">Precificação e Ancoragem</p>
          <div className="hera-card p-4 border-l-[3px] border-l-primary">
            <p className="text-sm text-foreground leading-relaxed">{asString(d.precificacao)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "done" | "alert";
}) {
  const cls = accent === "done" ? "text-hera-done" : "text-hera-alert";
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${cls}`}>{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
