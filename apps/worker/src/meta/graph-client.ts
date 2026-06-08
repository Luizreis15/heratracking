const DEFAULT_VERSION = "v21.0";

export type GraphPaginated<T> = { data: T[]; paging?: { next?: string } };

export async function graphFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: { message: string; code?: number } };
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `Meta Graph ${res.status}`;
    const err = new Error(msg);
    (err as Error & { code?: number }).code = json.error?.code;
    throw err;
  }
  return json;
}

export async function fetchPaginated<T>(startUrl: string, maxPages = 10): Promise<T[]> {
  const all: T[] = [];
  let next: string | null = startUrl;
  let pages = 0;
  while (next && pages < maxPages) {
    const json: GraphPaginated<T> = await graphFetch<GraphPaginated<T>>(next);
    if (Array.isArray(json.data)) all.push(...json.data);
    next = json.paging?.next ?? null;
    pages += 1;
  }
  return all;
}

export function graphUrl(
  path: string,
  params: Record<string, string>,
  version = process.env.META_GRAPH_VERSION ?? DEFAULT_VERSION,
): string {
  const u = new URL(`https://graph.facebook.com/${version}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}
