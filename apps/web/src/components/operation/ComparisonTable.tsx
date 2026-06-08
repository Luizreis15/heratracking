import { ExternalLink } from "lucide-react";
import type { Competitor } from "@/types/index";
import type { OperadorProfile } from "@/lib/operador-profile";
import { normalizeInstagramUrl } from "@/lib/operador-profile";
import { COMPARISON_ROWS, ourAngulos, theirAngulos } from "@/lib/comparison-rows";

type Props = {
  operador: OperadorProfile;
  competitors: Competitor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Comparativo 1:1 — foco em uma agência */
export function ComparisonTable({ operador, competitors, selectedId, onSelect }: Props) {
  const selected =
    competitors.find((c) => c.id === selectedId) ?? competitors[0] ?? null;

  if (competitors.length === 0) {
    return (
      <div className="hera-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Mapeie concorrentes na aba Concorrência para comparar lado a lado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {competitors.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={[
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              selected?.id === c.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            ].join(" ")}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {selected && (
        <div className="hera-card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-hera-surface/50">
                <th className="text-left py-3 px-4 hera-label w-32">Critério</th>
                <th className="text-left py-3 px-4 font-semibold text-primary">
                  {operador.nome}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {selected.nome}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => {
                const ours = row.ours(operador);
                const theirs = row.theirs(selected);
                return (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="py-3 px-4 hera-label">{row.label}</td>
                    <td className="py-3 px-4 text-xs text-foreground/90 leading-relaxed">
                      {ours ?? <span className="opacity-40">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground leading-relaxed">
                      {theirs ?? <span className="opacity-40">—</span>}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b border-border/60 align-top">
                <td className="py-3 px-4 hera-label">Ângulos</td>
                <td className="py-3 px-4">
                  <AnguloList items={ourAngulos(operador)} />
                </td>
                <td className="py-3 px-4">
                  <AnguloList items={theirAngulos(selected)} />
                </td>
              </tr>
              <tr className="align-top">
                <td className="py-3 px-4 hera-label">Links</td>
                <td className="py-3 px-4">
                  <LinkChips url={operador.url} instagram={operador.instagram} />
                </td>
                <td className="py-3 px-4">
                  <LinkChips
                    url={selected.url ?? undefined}
                    instagram={selected.instagram ?? undefined}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnguloList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-xs opacity-40">—</span>;
  return (
    <ul className="text-xs text-muted-foreground space-y-0.5">
      {items.map((a) => (
        <li key={a}>· {a}</li>
      ))}
    </ul>
  );
}

function LinkChips({ url, instagram }: { url?: string; instagram?: string }) {
  if (!url && !instagram) return <span className="text-xs opacity-40">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {url && (
        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Site <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {instagram && (
        <a
          href={normalizeInstagramUrl(instagram)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Instagram <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
