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

function nomeFromHandle(handle: string): string {
  return handle
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Detecta URL/Instagram soltos ou formato `Nome | url | nota` */
function parseLine(line: string): ConcorrenteSeed | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Linha que é só URL ou instagram
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^(www\.)?instagram\.com\//i.test(trimmed) ||
    /^instagram\.com\//i.test(trimmed) ||
    /^[a-z0-9-]+\.(com|com\.br|net|io)\b/i.test(trimmed);

  if (looksLikeUrl && !trimmed.includes("|")) {
    if (isInstagramUrl(trimmed)) {
      const ig = normalizeUrl(trimmed);
      const handle = handleFromInstagram(ig);
      return {
        nome: nomeFromHandle(handle),
        instagram: ig,
        notas: `Perfil Instagram @${handle}`,
      };
    }
    const url = normalizeUrl(trimmed);
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return { nome: host, url };
    } catch {
      return { nome: trimmed, url: normalizeUrl(trimmed) };
    }
  }

  const parts = trimmed.split("|").map((p) => p.trim());
  const nome = parts[0];
  if (!nome) return null;

  let url: string | undefined;
  let instagram: string | undefined;
  let notas: string | undefined;

  for (const part of parts.slice(1)) {
    if (!part) continue;
    if (isInstagramUrl(part) || /^@[\w.]+$/.test(part)) {
      const raw = part.startsWith("@") ? `https://instagram.com/${part.slice(1)}` : normalizeUrl(part);
      instagram = raw;
    } else if (/^https?:\/\//i.test(part) || part.includes(".com")) {
      url = normalizeUrl(part);
    } else {
      notas = notas ? `${notas}; ${part}` : part;
    }
  }

  if (isInstagramUrl(nome)) {
    const ig = normalizeUrl(nome);
    const handle = handleFromInstagram(ig);
    return {
      nome: nomeFromHandle(handle),
      instagram: ig,
      url,
      notas: notas ?? `Perfil Instagram @${handle}`,
    };
  }

  return { nome, url, instagram, notas };
}

/** Corrige seeds antigas salvas só com URL/IG no campo nome */
export function normalizeStoredSeed(seed: ConcorrenteSeed): ConcorrenteSeed {
  if (seed.instagram) return seed;
  if (isInstagramUrl(seed.nome) || /^@[\w.]+$/.test(seed.nome)) {
    const reparsed = parseLine(seed.nome);
    if (reparsed) return { ...reparsed, url: seed.url ?? reparsed.url, notas: seed.notas ?? reparsed.notas };
  }
  return seed;
}

export function parseSeedsFromText(text: string): ConcorrenteSeed[] {
  const seeds: ConcorrenteSeed[] = [];
  for (const line of text.split("\n")) {
    const seed = parseLine(line);
    if (seed) seeds.push(seed);
  }
  return seeds;
}

export function parseSeedsFromJson(raw: unknown): ConcorrenteSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is ConcorrenteSeed =>
        !!s &&
        typeof s === "object" &&
        "nome" in s &&
        typeof (s as ConcorrenteSeed).nome === "string",
    )
    .map((s) => normalizeStoredSeed(s as ConcorrenteSeed));
}

export function formatSeedsForTextarea(seeds: ConcorrenteSeed[]): string {
  return seeds
    .map((s) => {
      const parts = [s.nome];
      if (s.url) parts.push(s.url);
      if (s.instagram) parts.push(s.instagram);
      if (s.notas) parts.push(s.notas);
      return parts.join(" | ");
    })
    .join("\n");
}

export function mergeSeeds(
  existing: ConcorrenteSeed[],
  added: ConcorrenteSeed[],
): ConcorrenteSeed[] {
  const map = new Map<string, ConcorrenteSeed>();

  function key(s: ConcorrenteSeed) {
    if (s.instagram) return `ig:${handleFromInstagram(s.instagram).toLowerCase()}`;
    if (s.url) return `url:${s.url.toLowerCase()}`;
    return `nome:${s.nome.toLowerCase().trim()}`;
  }

  for (const s of [...existing, ...added]) {
    const k = key(s);
    const prev = map.get(k);
    map.set(k, { ...prev, ...s, nome: s.nome || prev?.nome || "" });
  }
  return [...map.values()];
}
