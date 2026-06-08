export type IntelEventType = "post" | "landing" | "criativo" | "oferta" | "outro";

export type IntelEventInput = {
  competitor_nome: string;
  event_type: IntelEventType;
  titulo: string;
  resumo?: string | null;
  url?: string | null;
  fonte?: string | null;
  detected_at?: string | null;
};
