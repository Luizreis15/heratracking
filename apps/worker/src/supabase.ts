import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import ws from "ws";
import type { Env } from "./env.js";

/** Worker é headless (só REST/poll) — SDK ainda inicializa Realtime; Node < 22 precisa de `ws`. */
export const SERVICE_CLIENT_OPTIONS: SupabaseClientOptions<"public"> = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
};

export function createServiceClient(env: Env): SupabaseClient {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    SERVICE_CLIENT_OPTIONS,
  );
}
