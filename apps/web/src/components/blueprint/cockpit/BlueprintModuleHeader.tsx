import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RefineModuleButton } from "../comercial/RefineModuleButton";

type BlueprintModuleHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  refineLabel?: string;
  refinePlaceholder?: string;
  onRefine?: (instruction: string) => Promise<void>;
  isRefining?: boolean;
  disabled?: boolean;
  children?: ReactNode;
};

export function BlueprintModuleHeader({
  icon: Icon,
  title,
  subtitle,
  refineLabel = "Ajustar",
  refinePlaceholder,
  onRefine,
  isRefining = false,
  disabled = false,
  children,
}: BlueprintModuleHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        {onRefine && refinePlaceholder && (
          <RefineModuleButton
            label={refineLabel}
            moduleName={title}
            placeholder={refinePlaceholder}
            onRefine={onRefine}
            isRefining={isRefining}
            disabled={disabled}
          />
        )}
      </div>
      {children}
    </div>
  );
}
