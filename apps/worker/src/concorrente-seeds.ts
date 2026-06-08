export type ConcorrenteSeed = {
  nome: string;
  url?: string;
  instagram?: string;
  notas?: string;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function isInstagramUrl(value: string): boolean {
  return /instagram\.com\//i.test(value);
}

function handleFromInstagram(value: string): string {
  const normalized = normalizeUrl(value);
  try {
    const path = new URL(normalized).pathname.replace(/^\//, "");
    return path.split("/")[0] ?? value;
  } catch {
    const m = value.match(/instagram\.com\/([^/?]+)/i);
    return m?.[1] ?? value;
  }
}

function parseLine(line: string): ConcorrenteSeed | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (isInstagramUrl(trimmed)) {
    const ig = normalizeUrl(trimmed);
    const handle = handleFromInstagram(ig);
    return {
      nome: handle.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      instagram: ig,
      notas: `Perfil Instagram @${handle}`,
    };
  }
  return { nome: trimmed };
}

export function normalizeStoredSeed(seed: ConcorrenteSeed): ConcorrenteSeed {
  if (seed.instagram) return seed;
  if (isInstagramUrl(seed.nome) || /^@[\w.]+$/.test(seed.nome)) {
    const reparsed = parseLine(seed.nome);
    if (reparsed) {
      return {
        ...reparsed,
        url: seed.url ?? reparsed.url,
        notas: seed.notas ?? reparsed.notas,
      };
    }
  }
  return seed;
}

export function parseSeeds(raw: unknown): ConcorrenteSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is ConcorrenteSeed =>
        !!s &&
        typeof s === "object" &&
        "nome" in s &&
        typeof (s as ConcorrenteSeed).nome === "string" &&
        (s as ConcorrenteSeed).nome.trim().length > 0,
    )
    .map((s) =>
      normalizeStoredSeed({
        nome: s.nome,
        url: s.url,
        instagram: s.instagram,
        notas: s.notas,
      }),
    );
}

export function formatSeedsForPrompt(seeds: ConcorrenteSeed[]): string {
  if (seeds.length === 0) return "Nenhum concorrente manual informado.";

  return seeds
    .map((s, i) => {
      const lines = [`${i + 1}. ${s.nome}`];
      if (s.url) lines.push(`   Site: ${s.url}`);
      if (s.instagram) {
        const handle = handleFromInstagram(s.instagram);
        lines.push(`   Instagram: ${normalizeUrl(s.instagram)} (@${handle})`);
        lines.push(
          `   → Busque: "@${handle} marketing odonto", "${s.nome} agência", site/link na bio, depoimentos`,
        );
      }
      if (s.notas) lines.push(`   Notas: ${s.notas}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
