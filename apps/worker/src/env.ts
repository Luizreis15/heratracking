import { z } from "zod";

const EnvSchema = z
  .object({
    /** Legado — roteamento é híbrido por job_mode; mantido para compatibilidade */
    LLM_PROVIDER: z.enum(["perplexity", "claude", "hybrid"]).default("hybrid"),
    ANTHROPIC_API_KEY: z.string().min(1),
    PERPLEXITY_API_KEY: z.string().min(1),
    PERPLEXITY_MODEL: z.string().default("sonar-pro"),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    POLL_INTERVAL_MS: z.coerce.number().default(5000),
    INTEL_AUTO_SCAN_HOURS: z.coerce.number().default(0),
    META_GRAPH_VERSION: z.string().default("v21.0"),
    HERA_PREMIUM_SUPABASE_URL: z.string().url().optional(),
    HERA_PREMIUM_SERVICE_ROLE_KEY: z.string().optional(),
    HERA_PREMIUM_CLIENT_ID: z.string().uuid().optional(),
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env | null {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.warn("[worker] Variáveis de ambiente ausentes ou inválidas:");
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "env";
      console.warn(`  ${field}: ${issue.message}`);
    }
    console.warn("[worker] Copie apps/worker/.env.example para apps/worker/.env e preencha os valores.");
    return null;
  }
  return result.data;
}
