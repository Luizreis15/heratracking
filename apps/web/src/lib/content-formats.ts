import { Film, Images, Layout, Mail, Play } from "lucide-react";

export type ContentFormat =
  | "carrossel_instagram"
  | "post_estatico"
  | "reels"
  | "email_prospeccao"
  | "post_instagram"
  | "script_reels";

export type FunilEtapa = "topo" | "meio" | "fundo";

export const FUNIL_CONFIG: Record<
  FunilEtapa,
  { label: string; short: string; desc: string; color: string }
> = {
  topo: {
    label: "Topo de funil",
    short: "Topo",
    desc: "Awareness — gancho contraintuitivo, parar o scroll",
    color: "text-hera-cyan",
  },
  meio: {
    label: "Meio de funil",
    short: "Meio",
    desc: "Consideração — mecanismo, prova, autoridade",
    color: "text-hera-running",
  },
  fundo: {
    label: "Fundo de funil",
    short: "Fundo",
    desc: "Conversão — CTA direto, demo, call",
    color: "text-primary",
  },
};

export const FORMAT_CONFIG: Record<
  ContentFormat,
  { label: string; icon: typeof Play; color: string; funilHint: string }
> = {
  carrossel_instagram: {
    label: "Carrossel",
    icon: Images,
    color: "text-pink-500",
    funilHint: "Ideal meio/fundo — sequência educativa",
  },
  post_estatico: {
    label: "Post estático",
    icon: Layout,
    color: "text-blue-400",
    funilHint: "Ideal topo/meio — 1 arte + legenda",
  },
  reels: {
    label: "Reels",
    icon: Film,
    color: "text-violet-500",
    funilHint: "Ideal topo — hook 3s + roteiro",
  },
  email_prospeccao: {
    label: "Email B2B",
    icon: Mail,
    color: "text-hera-running",
    funilHint: "Ideal fundo — prospecção direta",
  },
  post_instagram: {
    label: "Post estático",
    icon: Layout,
    color: "text-blue-400",
    funilHint: "Legado — tratado como post estático",
  },
  script_reels: {
    label: "Reels",
    icon: Play,
    color: "text-violet-500",
    funilHint: "Legado — tratado como Reels",
  },
};

export const GENERATION_FORMATS: ContentFormat[] = [
  "carrossel_instagram",
  "post_estatico",
  "reels",
  "email_prospeccao",
];

export function normalizeFormat(f: string): ContentFormat {
  if (f === "post_instagram") return "post_estatico";
  if (f === "script_reels") return "reels";
  return f as ContentFormat;
}

export function getFunilEtapa(content: Record<string, unknown>): FunilEtapa {
  const f = content.funil_etapa;
  if (f === "topo" || f === "meio" || f === "fundo") return f;
  return "meio";
}
