import type { IntelEventInput } from "../intel-types.js";
import { fetchPaginated, graphUrl } from "./graph-client.js";
import type { PremiumMetaConnection } from "./premium-connection.js";

const SINCE_DAYS = 14;

type IgMedia = {
  id: string;
  caption?: string;
  timestamp?: string;
  permalink?: string;
  media_type?: string;
};

type AdArchiveRow = {
  id?: string;
  page_name?: string;
  ad_snapshot_url?: string;
  ad_creative_bodies?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
};

function sinceIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - SINCE_DAYS);
  return d.toISOString();
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Posts recentes do Instagram da Hera DG (Graph API). */
export async function fetchOurInstagramMedia(
  conn: PremiumMetaConnection,
  operadorNome: string,
): Promise<IntelEventInput[]> {
  if (!conn.instagramActorId || !conn.pageAccessToken) return [];

  const url = graphUrl(`${conn.instagramActorId}/media`, {
    fields: "caption,timestamp,permalink,media_type",
    limit: "15",
    access_token: conn.pageAccessToken,
  });

  try {
    const rows = await fetchPaginated<IgMedia>(url, 2);
    const cutoff = new Date(sinceIso()).getTime();
    const events: IntelEventInput[] = [];

    for (const m of rows) {
      if (!m.timestamp || new Date(m.timestamp).getTime() < cutoff) continue;
      const caption = m.caption?.trim() ?? "";
      events.push({
        competitor_nome: operadorNome,
        event_type: "post",
        titulo: caption
          ? truncate(caption.split("\n")[0] ?? caption, 120)
          : `Novo ${m.media_type ?? "conteúdo"} no Instagram`,
        resumo: caption ? truncate(caption, 400) : null,
        url: m.permalink ?? null,
        fonte: "meta_graph:instagram",
        detected_at: m.timestamp,
      });
    }
    return events;
  } catch (err) {
    console.warn("[worker][meta] IG media:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Ad Library — anúncios públicos por nome da agência concorrente. */
export async function searchAdLibraryForCompetitor(
  accessToken: string,
  competitorNome: string,
): Promise<IntelEventInput[]> {
  const url = graphUrl("ads_archive", {
    search_terms: competitorNome,
    ad_reached_countries: "['BR']",
    ad_active_status: "ALL",
    fields:
      "id,page_name,ad_snapshot_url,ad_creative_bodies,ad_delivery_start_time,ad_delivery_stop_time",
    limit: "10",
    access_token: accessToken,
  });

  try {
    const rows = await fetchPaginated<AdArchiveRow>(url, 2);
    const cutoff = new Date(sinceIso()).getTime();
    const events: IntelEventInput[] = [];

    for (const ad of rows) {
      const start = ad.ad_delivery_start_time;
      if (start && new Date(start).getTime() < cutoff) continue;

      const body = ad.ad_creative_bodies?.[0]?.trim() ?? "";
      events.push({
        competitor_nome: ad.page_name ?? competitorNome,
        event_type: "criativo",
        titulo: body
          ? truncate(body.split("\n")[0] ?? body, 120)
          : `Anúncio ativo — ${competitorNome}`,
        resumo: body ? truncate(body, 400) : "Criativo detectado na Meta Ad Library",
        url: ad.ad_snapshot_url ?? null,
        fonte: "meta_ad_library",
        detected_at: start ?? new Date().toISOString(),
      });
    }
    return events;
  } catch (err) {
    console.warn(
      `[worker][meta] Ad Library (${competitorNome}):`,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export async function collectMetaIntelEvents(opts: {
  conn: PremiumMetaConnection;
  operadorNome: string;
  competitors: Array<{ nome: string }>;
}): Promise<IntelEventInput[]> {
  const { conn, operadorNome, competitors } = opts;
  const events: IntelEventInput[] = [];

  events.push(...(await fetchOurInstagramMedia(conn, operadorNome)));

  const adsToken = conn.accessToken ?? conn.pageAccessToken;
  if (adsToken) {
    for (const c of competitors) {
      const found = await searchAdLibraryForCompetitor(adsToken, c.nome);
      events.push(...found);
      // Rate-limit gentil entre concorrentes
      await new Promise((r) => setTimeout(r, 300));
    }
  } else {
    console.warn("[worker][meta] Sem token Ads — Ad Library ignorada");
  }

  return events;
}
