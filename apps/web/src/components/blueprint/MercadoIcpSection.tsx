import type { Json } from "@/types/index";
import { asString, asStrings, type MercadoIcpData } from "@/lib/blueprint-types";

const NIVEL_LABELS: Record<number, string> = {
  1: "Sem consciência do problema",
  2: "Consciente do problema",
  3: "Consciente da solução",
  4: "Consciente do produto — comparando opções",
  5: "Mais consciente — pronto para decidir",
};

function TextWithCitations({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\[\d+\]$/.test(part) ? (
          <sup key={i} className="text-[9px] text-primary ml-0.5 font-semibold">
            {part}
          </sup>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function MercadoIcpSection({ data }: { data: Json }) {
  const d = (data ?? {}) as MercadoIcpData;
  const icp = d.icp ?? {};
  const filtro = d.filtro_perfil ?? {};

  const dores = asStrings(icp.dores);
  const desejos = asStrings(icp.desejos);
  const objecoes = asStrings(icp.objecoes);
  const ondeEsta = asStrings(icp.onde_esta);
  const resumo = asStrings(d.resumo_mercado);
  const verde = asStrings(filtro.verde);
  const amarelo = asStrings(filtro.amarelo);
  const vermelho = asStrings(filtro.vermelho);

  return (
    <div className="space-y-8 pt-2">

      {/* Quem é — persona card */}
      {icp.quem_e && (
        <div className="hera-card p-4 border-l-[3px] border-l-primary">
          <p className="hera-label mb-2">Quem é o ICP</p>
          <p className="text-sm text-foreground leading-relaxed">{asString(icp.quem_e)}</p>
        </div>
      )}

      {/* Situação Gatilho */}
      {icp.situacao_gatilho && (
        <div>
          <p className="hera-label mb-2">Situação Gatilho</p>
          <blockquote className="border-l-4 border-primary/40 pl-4 py-2.5 bg-accent/25 rounded-r-lg">
            <p className="text-sm text-foreground leading-relaxed italic">
              {asString(icp.situacao_gatilho)}
            </p>
          </blockquote>
        </div>
      )}

      {/* Dores — coração da decisão */}
      {dores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="hera-label">
              Dores do ICP{" "}
              <span className="normal-case font-normal text-muted-foreground">
                ({dores.length} identificadas)
              </span>
            </p>
            <span className="text-[10px] text-muted-foreground">
              Ordem = intensidade
            </span>
          </div>
          <div className="space-y-2">
            {dores.map((dor, i) => (
              <div
                key={i}
                className={[
                  "flex gap-3 rounded-lg border px-4 py-3",
                  i === 0
                    ? "border-destructive/40 bg-destructive/5"
                    : i < 3
                      ? "border-hera-alert/35 bg-hera-alert/5"
                      : "border-border bg-hera-surface/40",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold mt-0.5",
                    i === 0
                      ? "bg-destructive/20 text-destructive"
                      : i < 3
                        ? "bg-hera-alert/20 text-hera-alert"
                        : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed">{dor}</p>
              </div>
            ))}
          </div>
          {dores.length > 3 && (
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              As 3 primeiras são as âncoras de copy e conteúdo. Use no hook de cada criativo.
            </p>
          )}
        </div>
      )}

      {/* Desejos */}
      {desejos.length > 0 && (
        <div>
          <p className="hera-label mb-3">Desejos e Objetivos</p>
          <div className="space-y-2">
            {desejos.map((d, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-hera-done font-bold text-sm shrink-0 mt-0.5">✓</span>
                <p className="text-sm text-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objeções */}
      {objecoes.length > 0 && (
        <div>
          <p className="hera-label mb-3">Objeções Frequentes</p>
          <div className="space-y-2">
            {objecoes.map((obj, i) => (
              <div key={i} className="flex gap-3 items-start hera-card px-3 py-2.5">
                <span className="text-destructive font-bold text-sm shrink-0">✕</span>
                <p className="text-sm text-foreground leading-relaxed">{obj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onde está */}
      {ondeEsta.length > 0 && (
        <div>
          <p className="hera-label mb-3">Onde o ICP está</p>
          <div className="flex flex-wrap gap-2">
            {ondeEsta.map((canal, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-accent/30 text-foreground"
              >
                {canal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filtro de Perfil — semáforo */}
      {(verde.length > 0 || amarelo.length > 0 || vermelho.length > 0) && (
        <div>
          <p className="hera-label mb-3">Filtro de Perfil — Triagem</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {verde.length > 0 && (
              <FilterColumn
                title="Verde — Qualificado"
                dotColor="text-hera-done"
                borderColor="border-hera-done/30"
                bgColor="bg-hera-done/5"
                items={verde}
              />
            )}
            {amarelo.length > 0 && (
              <FilterColumn
                title="Amarelo — Analisar"
                dotColor="text-hera-alert"
                borderColor="border-hera-alert/30"
                bgColor="bg-hera-alert/5"
                items={amarelo}
              />
            )}
            {vermelho.length > 0 && (
              <FilterColumn
                title="Vermelho — Desqualificado"
                dotColor="text-destructive"
                borderColor="border-destructive/30"
                bgColor="bg-destructive/5"
                items={vermelho}
              />
            )}
          </div>
        </div>
      )}

      {/* Nível de Consciência */}
      {d.nivel_consciencia != null && (
        <div className="hera-card px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <p className="hera-label">Nível de Consciência</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={[
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    n <= (d.nivel_consciencia ?? 0)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground",
                  ].join(" ")}
                >
                  {n}
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground font-medium">
              {NIVEL_LABELS[d.nivel_consciencia] ?? ""}
            </p>
          </div>
        </div>
      )}

      {/* Resumo de Mercado */}
      {resumo.length > 0 && (
        <div>
          <p className="hera-label mb-3">Resumo de Mercado</p>
          <div className="space-y-2.5">
            {resumo.map((bullet, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-primary shrink-0 mt-1.5 text-xs">·</span>
                <p className="text-sm text-foreground leading-relaxed">
                  <TextWithCitations text={bullet} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterColumn({
  title,
  dotColor,
  borderColor,
  bgColor,
  items,
}: {
  title: string;
  dotColor: string;
  borderColor: string;
  bgColor: string;
  items: string[];
}) {
  return (
    <div className={`rounded-lg border p-4 ${borderColor} ${bgColor}`}>
      <p className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${dotColor}`}>
        <span className="text-base leading-none">●</span>
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
