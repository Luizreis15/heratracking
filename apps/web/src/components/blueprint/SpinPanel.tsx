import type { Json } from "@/types/index";

type SpinGuide = {
  situacao: string[];
  problema: string[];
  implicacao: string[];
  necessidade: string[];
};

const QUADRANTS = [
  {
    key: "situacao" as const,
    label: "S — SITUAÇÃO",
    subtitle: "Entenda o contexto do lead",
    borderClass: "border-blue-500/40",
    bgClass: "bg-blue-500/5",
    headingClass: "text-blue-400",
    dotClass: "bg-blue-400/60",
  },
  {
    key: "problema" as const,
    label: "P — PROBLEMA",
    subtitle: "Exponha a dor real",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/5",
    headingClass: "text-amber-400",
    dotClass: "bg-amber-400/60",
  },
  {
    key: "implicacao" as const,
    label: "I — IMPLICAÇÃO",
    subtitle: "Amplie a urgência",
    borderClass: "border-red-500/40",
    bgClass: "bg-red-500/5",
    headingClass: "text-red-400",
    dotClass: "bg-red-400/60",
  },
  {
    key: "necessidade" as const,
    label: "N — NECESSIDADE",
    subtitle: "Antecipe a solução",
    borderClass: "border-teal-500/40",
    bgClass: "bg-teal-500/5",
    headingClass: "text-teal-400",
    dotClass: "bg-teal-400/60",
  },
] as const;

function parseSpinGuide(raw: Json): SpinGuide | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (
    !Array.isArray(obj.situacao) ||
    !Array.isArray(obj.problema) ||
    !Array.isArray(obj.implicacao) ||
    !Array.isArray(obj.necessidade)
  ) {
    return null;
  }
  return {
    situacao: (obj.situacao as unknown[]).filter((s): s is string => typeof s === "string"),
    problema: (obj.problema as unknown[]).filter((s): s is string => typeof s === "string"),
    implicacao: (obj.implicacao as unknown[]).filter((s): s is string => typeof s === "string"),
    necessidade: (obj.necessidade as unknown[]).filter((s): s is string => typeof s === "string"),
  };
}

export function SpinPanel({ spinGuide }: { spinGuide: Json | null }) {
  const spin = spinGuide ? parseSpinGuide(spinGuide) : null;

  if (!spin) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="hera-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2">
          SPIN SELLING GUIDE
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUADRANTS.map((q) => {
          const questions = spin[q.key];
          if (!questions.length) return null;
          return (
            <div
              key={q.key}
              className={[
                "hera-card p-4 border",
                q.borderClass,
                q.bgClass,
              ].join(" ")}
            >
              <div className="mb-3">
                <p className={`hera-mono text-xs font-bold uppercase tracking-wider ${q.headingClass}`}>
                  {q.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{q.subtitle}</p>
              </div>
              <ol className="space-y-2">
                {questions.map((q_, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`hera-mono text-[10px] font-semibold shrink-0 mt-0.5 ${q.headingClass}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-xs text-foreground/90 leading-relaxed">{q_}</p>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
