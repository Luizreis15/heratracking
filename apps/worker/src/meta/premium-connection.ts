import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../env.js";
import { SERVICE_CLIENT_OPTIONS } from "../supabase.js";

export type PremiumMetaConnection = {
  clientId: string;
  accessToken: string | null;
  adAccountId: string | null;
  pageId: string | null;
  pageName: string | null;
  pageAccessToken: string | null;
  instagramActorId: string | null;
  instagramUsername: string | null;
  tokenStatus: string | null;
};

export function premiumSupabaseConfigured(env: Env): boolean {
  return Boolean(
    env.HERA_PREMIUM_SUPABASE_URL?.trim() && env.HERA_PREMIUM_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createPremiumClient(env: Env): SupabaseClient {
  return createClient(
    env.HERA_PREMIUM_SUPABASE_URL!,
    env.HERA_PREMIUM_SERVICE_ROLE_KEY!,
    SERVICE_CLIENT_OPTIONS,
  );
}

export async function loadPremiumMetaConnection(
  env: Env,
  clientId: string,
): Promise<PremiumMetaConnection | null> {
  if (!premiumSupabaseConfigured(env)) return null;

  const sb = createPremiumClient(env);
  const { data, error } = await sb
    .from("meta_connections")
    .select(
      "client_id, access_token, ad_account_id, page_id, page_name, page_access_token, instagram_actor_id, instagram_username, token_status",
    )
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    console.warn(`[worker][meta] premium meta_connections: ${error.message}`);
    return null;
  }
  if (!data) return null;

  return {
    clientId: data.client_id as string,
    accessToken: (data.access_token as string | null) ?? null,
    adAccountId: (data.ad_account_id as string | null) ?? null,
    pageId: (data.page_id as string | null) ?? null,
    pageName: (data.page_name as string | null) ?? null,
    pageAccessToken: (data.page_access_token as string | null) ?? null,
    instagramActorId: (data.instagram_actor_id as string | null) ?? null,
    instagramUsername: (data.instagram_username as string | null) ?? null,
    tokenStatus: (data.token_status as string | null) ?? null,
  };
}
