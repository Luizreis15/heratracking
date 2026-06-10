import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

type RefineModuleButtonProps = {
  label: string;
  moduleName: string;
  placeholder: string;
  onRefine: (instruction: string) => Promise<void>;
  isRefining?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
};

export function RefineModuleButton({
  label,
  moduleName,
  placeholder,
  onRefine,
  isRefining = false,
  disabled = false,
  variant = "ghost",
}: RefineModuleButtonProps) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!instruction.trim()) return;
    setSubmitting(true);
    try {
      await onRefine(instruction.trim());
      setOpen(false);
      setInstruction("");
    } finally {
      setSubmitting(false);
    }
  }

  const btnClass =
    variant === "primary"
      ? "hera-btn-primary text-xs"
      : "hera-btn-ghost border border-border text-xs";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || isRefining}
        className={btnClass}
      >
        {isRefining ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-lg border border-primary/30 bg-background shadow-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-primary">Ajustar — {moduleName}</p>
            <button type="button" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <textarea
            rows={3}
            autoFocus
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!instruction.trim() || submitting}
            className="hera-btn-primary text-xs w-full mt-2 justify-center"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Regenerar módulo"}
          </button>
        </div>
      )}
    </div>
  );
}
