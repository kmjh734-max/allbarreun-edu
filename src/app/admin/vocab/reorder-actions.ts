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

const ROLE = "admin" as const;

export async function reorderVocabSetsInFolder(
  folderId: string,
  orderedSetIds: string[]
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return actionError("관리자 권한이 필요합니다.");
  }

  const supabase = await createClient();
  const result = await persistVocabSetOrder(supabase, folderId, orderedSetIds);

  if (!result.ok) return actionError(result.message);

  revalidateVocabPaths(ROLE, { folderId });
  return actionSuccess("순서가 저장되었습니다.");
}
