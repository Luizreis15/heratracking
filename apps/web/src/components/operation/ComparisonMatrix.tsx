import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Competitor } from "@/types/index";
import type { OperadorProfile } from "@/lib/operador-profile";
import { normalizeInstagramUrl } from "@/lib/operador-profile";
import {
  COMPARISON_ROWS,
  ourAngulos,
  theirAngulos,
} from "@/lib/comparison-rows";

type Props = {
  operador: OperadorProfile;
  competitors: Competitor[];
  onFocusCompetitor?: (id: string) => void;
};

export function ComparisonMatrix({ operador, competitors, onFocusCompetitor }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => competitors.filter((c) => !hidden.has(c.id)),
    [competitors, hidden],
  );

  if (competitors.length === 0) {
    return (
      <div className="hera-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Mapeie concorrentes para ver a matriz comparativa.
        </p>
      </div>
    );
  }

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hera-label mr-1">Colunas:</span>
        {competitors.map((c) => {
          const on = !hidden.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={[
                "text-[10px] px-2.5 py-1 rounded-full border transition-colors",
                on
                  ? "border-border bg-accent/50 text-foreground"
                  : "border-border/40 text-muted-foreground/50 line-through",
              ].join(" ")}
            >
              {c.nome}
            </button>
          );
        })}
      </div>

      <div className="hera-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-hera-surface/80">
                <th className="sticky left-0 z-20 bg-hera-surface hera-label text-left py-3 px-3 w-28 min-w-28">
                  Critério
                </th>
                <th className="sticky left-28 z-20 bg-hera-surface text-left py-3 px-3 min-w-[200px] w-[200px] border-r border-primary/30 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.4)]">
                  <span className="font-semibold text-primary">{operador.nome}</span>
                  <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                    Nós
                  </span>
                </th>
                {visible.map((c) => (
                  <th
                    key={c.id}
                    className="text-left py-3 px-3 min-w-[180px] max-w-[220px] align-bottom"
                  >
                    {onFocusCompetitor ? (
                      <button
                        type="button"
                        onClick={() => onFocusCompetitor(c.id)}
                        className="font-semibold text-foreground hover:text-primary text-left transition-colors"
                      >
                        {c.nome}
                      </button>
                    ) : (
                      <span className="font-semibold text-foreground">{c.nome}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.id} className="border-b border-border/50 align-top">
                  <td className="sticky left-0 z-10 bg-background hera-label py-3 px-3">
                    {row.label}
                  </td>
                  <td className="sticky left-28 z-10 bg-background py-3 px-3 border-r border-primary/20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.35)]">
                    <Cell value={row.ours(operador)} multiline={row.multiline} highlight />
                  </td>
                  {visible.map((c) => (
                    <td key={c.id} className="py-3 px-3">
                      <Cell value={row.theirs(c)} multiline={row.multiline} />
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="border-b border-border/50 align-top">
                <td className="sticky left-0 z-10 bg-background hera-label py-3 px-3">
                  Ângulos
                </td>
                <td className="sticky left-28 z-10 bg-background py-3 px-3 border-r border-primary/20">
                  <AnguloChips items={ourAngulos(operador)} />
                </td>
                {visible.map((c) => (
                  <td key={c.id} className="py-3 px-3">
                    <AnguloChips items={theirAngulos(c)} />
                  </td>
                ))}
              </tr>

              <tr className="align-top">
                <td className="sticky left-0 z-10 bg-background hera-label py-3 px-3">
                  Links
                </td>
                <td className="sticky left-28 z-10 bg-background py-3 px-3 border-r border-primary/20">
                  <LinkChips url={operador.url} instagram={operador.instagram} />
                </td>
                {visible.map((c) => (
                  <td key={c.id} className="py-3 px-3">
                    <LinkChips url={c.url ?? undefined} instagram={c.instagram ?? undefined} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {visible.length} de {competitors.length} agências visíveis · role horizontalmente para ver
        todas as colunas
      </p>
    </div>
  );
}

function Cell({
  value,
  multiline,
  highlight,
}: {
  value?: string;
  multiline?: boolean;
  highlight?: boolean;
}) {
  if (!value) return <span className="opacity-35">—</span>;
  return (
    <p
      className={[
        "text-muted-foreground leading-relaxed",
        multiline ? "line-clamp-4" : "line-clamp-2",
        highlight ? "text-foreground/90" : "",
      ].join(" ")}
    >
      {value}
    </p>
  );
}

function AnguloChips({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="opacity-35">—</span>;
  const shown = items.slice(0, 4);
  const rest = items.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((a) => (
        <span
          key={a}
          className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent border border-border text-muted-foreground"
        >
          {a}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[9px] text-muted-foreground">+{rest}</span>
      )}
    </div>
  );
}

function LinkChips({ url, instagram }: { url?: string; instagram?: string }) {
  if (!url && !instagram) return <span className="opacity-35">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {url && (
        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline w-fit"
        >
          Site <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
      {instagram && (
        <a
          href={normalizeInstagramUrl(instagram)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline w-fit"
        >
          IG <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  );
}
