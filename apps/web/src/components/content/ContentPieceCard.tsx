import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { RefineModuleButton } from "@/components/blueprint/comercial/RefineModuleButton";
import {
  FORMAT_CONFIG,
  FUNIL_CONFIG,
  getFunilEtapa,
  normalizeFormat,
  type ContentFormat,
} from "@/lib/content-formats";
import type { Json } from "@/types/index";

export type ContentItemRow = {
  id: string;
  format: string;
  dor: string | null;
  content: Json;
  created_at: string;
};

function s(val: unknown): string {
  if (typeof val === "string") return val;
  if (val == null) return "";
  return String(val);
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        })
      }
      className="hera-btn-ghost border border-border text-[10px] py-1 px-2"
    >
      {ok ? <Check className="h-3 w-3 text-hera-done" /> : <Copy className="h-3 w-3" />}
      {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

function GanchoBanner({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-hera-alert/40 bg-hera-alert/10 px-4 py-3 mb-4">
      <p className="text-[10px] font-bold text-hera-alert uppercase tracking-wide mb-1">
        Gancho contraintuitivo
      </p>
      <p className="text-sm font-semibold text-foreground leading-snug">{text}</p>
    </div>
  );
}

function CarrosselBody({ c }: { c: Record<string, unknown> }) {
  const slides = Array.isArray(c.slides) ? (c.slides as string[]) : [];
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      <GanchoBanner text={s(c.gancho_contraintuitivo)} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slides.map((slide, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            className={[
              "shrink-0 w-28 h-24 rounded-lg border p-2 text-left text-xs transition-all",
              open === i ? "border-primary/60 bg-primary/10" : "border-border",
            ].join(" ")}
          >
            <span className="hera-mono text-[9px] text-primary">{i + 1}</span>
            <p className="line-clamp-4 mt-1 text-foreground/90">{slide}</p>
          </button>
        ))}
      </div>
      {slides[open] && (
        <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{slides[open]}</p>
      )}
      {s(c.legenda) && <p className="text-sm whitespace-pre-line">{s(c.legenda)}</p>}
      {s(c.cta) && <p className="text-sm text-hera-done font-medium">CTA: {s(c.cta)}</p>}
    </div>
  );
}

function PostEstaticoBody({ c }: { c: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <GanchoBanner text={s(c.gancho_contraintuitivo)} />
      {s(c.headline_imagem) && (
        <div className="rounded-xl border-2 border-dashed border-primary/40 p-6 text-center">
          <p className="text-lg font-bold">{s(c.headline_imagem)}</p>
        </div>
      )}
      {s(c.titulo) && !c.headline_imagem && <p className="font-semibold">{s(c.titulo)}</p>}
      {s(c.legenda || c.corpo) && (
        <p className="text-sm whitespace-pre-line">{s(c.legenda || c.corpo)}</p>
      )}
      {s(c.cta) && <p className="text-sm text-hera-done">CTA: {s(c.cta)}</p>}
    </div>
  );
}

function ReelsBody({ c }: { c: Record<string, unknown> }) {
  const telas = Array.isArray(c.texto_tela) ? (c.texto_tela as string[]) : [];
  return (
    <div className="space-y-3">
      <GanchoBanner text={s(c.gancho_contraintuitivo)} />
      {s(c.hook) && (
        <div>
          <p className="text-[10px] font-bold text-hera-alert uppercase mb-1">Hook 3s</p>
          <p className="text-sm font-semibold">{s(c.hook)}</p>
        </div>
      )}
      {s(c.desenvolvimento) && (
        <p className="text-sm whitespace-pre-line text-muted-foreground">{s(c.desenvolvimento)}</p>
      )}
      {telas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {telas.map((t, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {t}
            </span>
          ))}
        </div>
      )}
      {s(c.cta) && <p className="text-sm text-hera-done">CTA: {s(c.cta)}</p>}
    </div>
  );
}

function EmailBody({ c }: { c: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <GanchoBanner text={s(c.gancho_contraintuitivo)} />
      {s(c.assunto) && <p className="font-semibold">Assunto: {s(c.assunto)}</p>}
      {s(c.corpo) && <p className="text-sm whitespace-pre-line">{s(c.corpo)}</p>}
      {s(c.cta) && <p className="text-sm text-hera-done">CTA: {s(c.cta)}</p>}
    </div>
  );
}

type Props = {
  item: ContentItemRow;
  onRefine?: (instruction: string) => Promise<void>;
  isRefining?: boolean;
  onDelete?: () => void;
};

export function ContentPieceCard({ item, onRefine, isRefining, onDelete }: Props) {
  const c = (item.content ?? {}) as Record<string, unknown>;
  const fmt = normalizeFormat(item.format);
  const cfg = FORMAT_CONFIG[fmt as ContentFormat] ?? FORMAT_CONFIG.post_estatico;
  const Icon = cfg.icon;
  const funil = getFunilEtapa(c);
  const funilCfg = FUNIL_CONFIG[funil];
  const fullText = JSON.stringify(c, null, 2);

  return (
    <div className="hera-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-lg border border-border flex items-center justify-center shrink-0 ${cfg.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase ${funilCfg.color}`}>{funilCfg.short}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
            </div>
            {item.dor && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                <span className="font-semibold text-foreground/80">Dor: </span>
                {item.dor}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyBtn text={fullText} />
          {onRefine && (
            <RefineModuleButton
              label="Ajustar"
              moduleName={`${cfg.label} — ${funilCfg.short}`}
              placeholder='Ex.: "Gancho mais polêmico para CTO" ou "CTA para demo de 15 min"'
              onRefine={onRefine}
              isRefining={isRefining}
            />
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-[10px] text-muted-foreground hover:text-destructive px-2">
              Excluir
            </button>
          )}
        </div>
      </div>

      {fmt === "carrossel_instagram" && <CarrosselBody c={c} />}
      {(fmt === "post_estatico" || item.format === "post_instagram") && <PostEstaticoBody c={c} />}
      {(fmt === "reels" || item.format === "script_reels") && <ReelsBody c={c} />}
      {fmt === "email_prospeccao" && <EmailBody c={c} />}
    </div>
  );
}
