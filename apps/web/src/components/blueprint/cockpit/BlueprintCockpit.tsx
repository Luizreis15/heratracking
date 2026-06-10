import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { CockpitStat } from "./types";

export type CockpitModule<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  refining?: boolean;
};

type BlueprintCockpitProps<T extends string> = {
  title: string;
  subtitle: string;
  stats: CockpitStat[];
  modules: CockpitModule<T>[];
  activeModule: T;
  onSelectModule: (id: T) => void;
  children: ReactNode;
};

export function BlueprintCockpit<T extends string>({
  title,
  subtitle,
  stats,
  modules,
  activeModule,
  onSelectModule,
  children,
}: BlueprintCockpitProps<T>) {
  return (
    <div className="space-y-6 -mx-2">
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
        <div>
          <p className="hera-label mb-1">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="hera-stat-tile text-center py-3 px-2">
                <p className="hera-mono text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const active = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule(mod.id)}
                className={[
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  active
                    ? "border-primary/60 bg-primary/15 text-foreground shadow-[0_0_12px_rgba(191,155,77,0.12)]"
                    : "border-border bg-background/50 text-muted-foreground hover:border-primary/30",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {mod.label}
                {mod.refining && (
                  <span className="h-1.5 w-1.5 rounded-full bg-hera-cyan animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hera-card p-5 lg:p-6 min-h-[280px]">{children}</div>
    </div>
  );
}
