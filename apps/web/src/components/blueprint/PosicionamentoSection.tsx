import type { Json } from "@/types/index";
import { asString, asStrings, type PosicionamentoData } from "@/lib/blueprint-types";

type Pilar = {
  nome?: string;
  titulo?: string;
  descricao?: string;
  exemplos?: unknown;
  funil?: string;
  etapa_funil?: string;
};

function parsePilar(item: unknown, i: number): Pilar & { index: number } {
  if (typeof item === "string") {
    const parts = item.split(":");
    return {
      index: i,
      nome: parts[0]?.trim() ?? `Pilar ${i + 1}`,
      descricao: parts.slice(1).join(":").trim(),
    };
  }
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const obj = item as Pilar;
    return { index: i, ...obj };
  }
  return { index: i, nome: `Pilar ${i + 1}`, descricao: String(item) };
}

const PILAR_COLORS = [
  "border-primary/30",
  "border-hera-running/30",
  "border-hera-done/30",
  "border-hera-alert/30",
  "border-destructive/25",
];

const NARRATIVA_STEPS = [
  { key: "heroi", label: "Herói", desc: "Quem é o cliente e o que ele quer" },
  { key: "problema", label: "Problema", desc: "O obstáculo que o impede" },
  { key: "guia", label: "Guia", desc: "Como a agência aparece para ajudar" },
  { key: "plano", label: "Plano", desc: "Os passos concretos da solução" },
  { key: "cta", label: "CTA", desc: "A ação que o cliente deve tomar" },
] as const;

export function PosicionamentoSection({ data }: { data: Json }) {
  const d = (data ?? {}) as PosicionamentoData;
  const narrativa = d.narrativa ?? {};
  const pilares = Array.isArray(d.pilares_conteudo) ? d.pilares_conteudo : [];
  const editorial = d.linha_editorial ?? {};
  const formatos = asStrings(editorial.formatos);

  return (
    <div className="space-y-8 pt-2">

      {/* Statement — hero text */}
      {d.statement && (
        <div className="hera-card p-6 border-primary/30 bg-gradient-to-br from-primary/8 to-transparent">
          <p className="hera-label mb-3">Statement de Posicionamento</p>
          <p className="text-lg font-serif font-semibold text-foreground leading-relaxed">
            &ldquo;{asString(d.statement)}&rdquo;
          </p>
        </div>
      )}

      {/* Narrativa StoryBrand */}
      {Object.values(narrativa).some((v) => v) && (
        <div>
          <p className="hera-label mb-4">Narrativa da Marca (StoryBrand)</p>
          <div className="space-y-3">
            {NARRATIVA_STEPS.map((step, i) => {
              const val = asString(narrativa[step.key]);
              if (!val) return null;
              return (
                <div key={step.key} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    {i < NARRATIVA_STEPS.length - 1 && (
                      <div className="w-px h-4 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="text-xs font-semibold text-primary">{step.label}</p>
                      <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{val}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pilares de Conteúdo */}
      {pilares.length > 0 && (
        <div>
          <p className="hera-label mb-4">
            Pilares de Conteúdo{" "}
            <span className="normal-case font-normal text-muted-foreground">
              ({pilares.length} pilares)
            </span>
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pilares.map((item, i) => {
              const p = parsePilar(item, i);
              const borderColor = PILAR_COLORS[i % PILAR_COLORS.length];
              const exemplos = asStrings(p.exemplos);
              const funil = asString(p.funil ?? p.etapa_funil ?? "");
              return (
                <div
                  key={i}
                  className={`hera-card p-4 border-l-[3px] ${borderColor} flex flex-col gap-2`}
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {p.nome ?? p.titulo ?? `Pilar ${i + 1}`}
                    </p>
                    {funil && (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {funil}
                      </span>
                    )}
                  </div>
                  {p.descricao && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.descricao}</p>
                  )}
                  {exemplos.length > 0 && (
                    <ul className="space-y-1 pt-1 border-t border-border/40">
                      {exemplos.slice(0, 3).map((ex, j) => (
                        <li key={j} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-primary shrink-0">·</span>
                          {ex}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Linha Editorial */}
      {(editorial.mix || formatos.length > 0 || editorial.cadencia || editorial.bio_cta) && (
        <div>
          <p className="hera-label mb-3">Linha Editorial</p>
          <div className="hera-card p-5 space-y-4">
            {editorial.mix && (
              <div>
                <p className="hera-label mb-1.5">Mix de Conteúdo</p>
                <p className="text-sm text-foreground leading-relaxed">{asString(editorial.mix)}</p>
              </div>
            )}
            {formatos.length > 0 && (
              <div>
                <p className="hera-label mb-2">Formatos</p>
                <div className="flex flex-wrap gap-2">
                  {formatos.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full border border-border bg-accent/30 text-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {editorial.cadencia && (
              <div>
                <p className="hera-label mb-1.5">Cadência</p>
                <p className="text-sm text-foreground">{asString(editorial.cadencia)}</p>
              </div>
            )}
            {editorial.bio_cta && (
              <div>
                <p className="hera-label mb-1.5">Bio / CTA Principal</p>
                <div className="hera-card px-3 py-2.5 bg-accent/30">
                  <p className="text-sm text-foreground">{asString(editorial.bio_cta)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
