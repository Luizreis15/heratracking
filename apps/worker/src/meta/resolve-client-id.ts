import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../env.js";
import type { MethodProfile } from "../types.js";

export async function resolvePremiumClientId(
  supabase: SupabaseClient,
  workspaceId: string,
  profile: MethodProfile | null,
  env: Env,
): Promise<string | null> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("hera_premium_client_id")
    .eq("id", workspaceId)
    .maybeSingle();

  const fromWorkspace = (ws?.hera_premium_client_id as string | null)?.trim();
  if (fromWorkspace) return fromWorkspace;

  const ext = profile?.extensoes;
  if (ext && typeof ext === "object" && !Array.isArray(ext)) {
    const fromProfile = (ext as Record<string, unknown>).premium_client_id;
    if (typeof fromProfile === "string" && fromProfile.trim()) return fromProfile.trim();
  }

  const fromEnv = env.HERA_PREMIUM_CLIENT_ID?.trim();
  return fromEnv || null;
}

export function resolveOperadorNome(profile: MethodProfile | null): string {
  if (!profile?.extensoes) return "Hera DG";
  const ext = profile.extensoes;
  if (!ext || typeof ext !== "object" || Array.isArray(ext)) return "Hera DG";
  const perfil = (ext as Record<string, unknown>).perfil;
  if (perfil && typeof perfil === "object" && !Array.isArray(perfil)) {
    const nome = (perfil as Record<string, unknown>).nome;
    if (typeof nome === "string" && nome.trim()) return nome.trim();
  }
  return "Hera DG";
}
