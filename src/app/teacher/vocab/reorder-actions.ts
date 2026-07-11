"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/vocab/actions-shared";
import { persistVocabSetOrder } from "@/lib/vocab/reorder-sets";
import { revalidateVocabPaths } from "@/lib/vocab/revalidate";

const ROLE = "teacher" as const;

export async function reorderVocabSetsInFolder(
  folderId: string,
  orderedSetIds: string[]
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return actionError("강사 권한이 필요합니다.");
  }
  if (profile.is_active === false) {
    return actionError("비활성화된 계정입니다.");
  }

  const supabase = await createClient();
  const { data: folder } = await supabase
    .from("vocab_folders")
    .select("id")
    .eq("id", folderId)
    .or(`teacher_id.eq.${profile.id},created_by.eq.${profile.id}`)
    .maybeSingle();

  if (!folder) {
    return actionError("이 폴더를 관리할 권한이 없습니다.");
  }

  const result = await persistVocabSetOrder(supabase, folderId, orderedSetIds);

  if (!result.ok) return actionError(result.message);

  revalidateVocabPaths(ROLE, { folderId });
  return actionSuccess("순서가 저장되었습니다.");
}
