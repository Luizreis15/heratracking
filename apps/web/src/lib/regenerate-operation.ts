import { supabase } from "@/lib/supabase";

export type RegenerateOperationOptions = {
  keepCompetitors?: boolean;
  keepContent?: boolean;
  keepComparison?: boolean;
};

export async function regenerateOperation(
  operationId: string,
  opts: RegenerateOperationOptions = {},
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("fn_reset_operation_generation", {
    p_operation_id: operationId,
    p_keep_competitors: opts.keepCompetitors ?? true,
    p_keep_content: opts.keepContent ?? false,
    p_keep_comparison: opts.keepComparison ?? false,
  });

  if (error) return { error: error.message };
  return { error: null };
}
