import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/index";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** false em produção quando Vercel não tem as env vars no build */
export const isSupabaseConfigured = Boolean(url && anonKey);

function createSupabaseClient(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar configuradas",
    );
  }
  return createClient<Database>(url, anonKey);
}

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createSupabaseClient()
  : (new Proxy({} as SupabaseClient<Database>, {
      get() {
        throw new Error(
          "Supabase não configurado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY",
        );
      },
    }) as SupabaseClient<Database>);
