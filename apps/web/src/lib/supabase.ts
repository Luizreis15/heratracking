import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/index";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar em .env.local",
  );
}

export const supabase = createClient<Database>(url, anonKey);
