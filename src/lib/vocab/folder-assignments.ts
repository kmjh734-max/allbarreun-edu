import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bulkAssignSets,
  formatBulkAssignSuccess,
  type BulkAssignResult,
} from "@/lib/vocab/bulk-assign-sets";

export async function bulkAssignFolderSets(
  supabase: SupabaseClient,
  folderId: string,
  assignedBy: string,
  options: {
    classId?: string;
    studentIds?: string[];
  }
): Promise<BulkAssignResult | { ok: false; message: string }> {
  const { data: sets, error: setsError } = await supabase
    .from("vocab_sets")
    .select("id")
    .eq("folder_id", folderId);

  if (setsError) return { ok: false, message: setsError.message };
  if (!sets?.length) {
    return {
      ok: false,
      message: "이 폴더에 단어장이 없습니다. 먼저 단어세트를 만드세요.",
    };
  }

  const setIds = sets.map((s) => s.id as string);
  const result = await bulkAssignSets(supabase, setIds, assignedBy, options);
  if (!result.ok) return result;
  return result;
}

export { formatBulkAssignSuccess };
