export type CartaBlock = {
  tag: string;
  label: string;
  content: string;
};

const TAG_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  LEAD: { color: "text-blue-400", border: "border-blue-500/40", bg: "bg-blue-500/5" },
  PAS: { color: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/5" },
  MECANISMO: { color: "text-violet-400", border: "border-violet-500/40", bg: "bg-violet-500/5" },
  PROVA: { color: "text-teal-400", border: "border-teal-500/40", bg: "bg-teal-500/5" },
  OFERTA: { color: "text-primary", border: "border-primary/40", bg: "bg-primary/5" },
  GARANTIA: { color: "text-hera-done", border: "border-hera-done/40", bg: "bg-hera-done/5" },
  CTA: { color: "text-hera-cyan", border: "border-hera-cyan/40", bg: "bg-hera-cyan/5" },
  FAQ: { color: "text-muted-foreground", border: "border-border", bg: "bg-muted/20" },
  COMPLIANCE: { color: "text-red-400", border: "border-red-500/40", bg: "bg-red-500/5" },
};

export function cartaTagStyle(tag: string) {
  const key = tag.split(/\s+/)[0]?.toUpperCase() ?? tag;
  for (const [prefix, style] of Object.entries(TAG_STYLES)) {
    if (key.startsWith(prefix)) return style;
  }
  return { color: "text-foreground", border: "border-border", bg: "bg-muted/10" };
}

/** Quebra carta de vendas em blocos [TAG — descrição] + conteúdo */
export function parseCartaVendas(raw: string): { preamble: string; blocks: CartaBlock[] } {
  const text = raw.trim();
  if (!text) return { preamble: "", blocks: [] };

  const firstBracket = text.search(/\[/);
  const preamble = firstBracket > 0 ? text.slice(0, firstBracket).trim() : "";

  const body = firstBracket >= 0 ? text.slice(firstBracket) : text;
  const parts = body.split(/\n(?=\[)/).filter(Boolean);

  const blocks: CartaBlock[] = [];
  for (const part of parts) {
    const match = part.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    if (!match) continue;
    const label = match[1].trim();
    const tag = label.split(/[—–-]/)[0]?.trim().toUpperCase() ?? label;
    let content = match[2].trim();
    content = content.replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!content && !label) continue;
    blocks.push({ tag, label, content });
  }

  if (blocks.length === 0) {
    blocks.push({ tag: "CARTA", label: "Carta de Vendas", content: text });
  }

  return { preamble, blocks };
}

export type RoteiroStep = { title: string; duration: string | null; body: string };

/** Extrai título, duração e corpo de etapas do roteiro closer */
export function parseRoteiroStep(text: string, index: number): RoteiroStep {
  const trimmed = text.trim();
  const durationMatch = trimmed.match(/^(.+?)\s*\((\d+(?:[–-]\d+)?\s*min(?:utos)?)\)\s*:?\s*(.*)$/i);
  if (durationMatch) {
    return {
      title: durationMatch[1].trim(),
      duration: durationMatch[2].trim(),
      body: durationMatch[3].trim() || trimmed,
    };
  }
  const colonSplit = trimmed.match(/^([A-ZÀ-Ú0-9\s/]+):\s*(.+)$/);
  if (colonSplit && colonSplit[1].length < 60) {
    return { title: colonSplit[1].trim(), duration: null, body: colonSplit[2].trim() };
  }
  return { title: `Etapa ${index + 1}`, duration: null, body: trimmed };
}

export type ObjectionCard = { title: string; script: string };

/** Separa objeções / fechamentos das perguntas do closer */
export function parseObjectionItem(text: string): ObjectionCard {
  const trimmed = text.trim();
  const quoted = trimmed.match(/^([^:]+):\s*["'](.+)["']$/s);
  if (quoted) {
    return { title: quoted[1].trim(), script: quoted[2].trim() };
  }
  const dash = trimmed.match(/^([^—–-]+)[—–-]\s*(.+)$/s);
  if (dash) {
    return { title: dash[1].trim(), script: dash[2].trim().replace(/^["']|["']$/g, "") };
  }
  const firstLine = trimmed.indexOf("\n");
  if (firstLine > 0) {
    return {
      title: trimmed.slice(0, firstLine).replace(/["']/g, "").trim(),
      script: trimmed.slice(firstLine + 1).trim().replace(/^["']|["']$/g, ""),
    };
  }
  return { title: trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : ""), script: trimmed };
}
