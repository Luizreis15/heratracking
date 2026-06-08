import type { Json } from "@/types/index";

export function JsonTree({ value, depth = 0 }: { value: Json; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (typeof value === "string") {
    return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-sm text-foreground">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-muted-foreground">Vazio</span>;
    return (
      <ul className={`space-y-1.5 ${depth > 0 ? "ml-4 list-disc" : "list-none"}`}>
        {value.map((item, i) => (
          <li key={i} className="text-sm">
            {typeof item === "string" ? (
              <span className="text-foreground">{item}</span>
            ) : (
              <JsonTree value={item as Json} depth={depth + 1} />
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-xs text-muted-foreground">Vazio</span>;
    return (
      <div className={`space-y-3 ${depth > 0 ? "ml-2 border-l border-border pl-3" : ""}`}>
        {entries.map(([key, val]) => (
          <div key={key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {formatKey(key)}
            </p>
            <JsonTree value={val as Json} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function formatKey(key: string) {
  return key.replace(/_/g, " ");
}
