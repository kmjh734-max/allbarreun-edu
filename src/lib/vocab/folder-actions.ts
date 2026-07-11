"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { revalidateVocabPaths } from "@/lib/vocab/revalidate";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/vocab/actions-shared";

type Role = "admin" | "teacher";

async function requireRole(role: Role) {
  const profile = await getCurrentProfile();
  if (!profile) return { profile: null, error: actionError("로그인이 필요합니다.") };
  if (profile.role !== role) {
    return { profile: null, error: actionError("권한이 없습니다.") };
  }
  if (role === "teacher" && profile.is_active === false) {
    return { profile: null, error: actionError("비활성화된 계정입니다.") };
  }
  return { profile, error: null };
}

export async function createVocabFolder(
  role: Role,
  input: { name: string; teacherId?: string }
): Promise<ActionResult & { folderId?: string }> {
  const { profile, error } = await requireRole(role);
  if (error) return error;

  const name = input.name.trim();
  if (!name) return actionError("폴더 이름을 입력해 주세요.");

  const supabase = await createClient();
  const { data, error: insertError } = await supabase
    .from("vocab_folders")
    .insert({
      name,
      teacher_id:
        role === "teacher" ? profile!.id : input.teacherId || null,
      created_by: profile!.id,
    })
    .select("id")
    .single();

  if (insertError) return actionError(insertError.message);

  revalidateVocabPaths(role);
  return { ...actionSuccess("폴더가 생성되었습니다."), folderId: data.id };
}

export async function updateVocabFolder(
  role: Role,
  folderId: string,
  input: { name: string }
): Promise<ActionResult> {
  const { error } = await requireRole(role);
  if (error) return error;

  const name = input.name.trim();
  if (!name) return actionError("폴더 이름을 입력해 주세요.");

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("vocab_folders")
    .update({ name })
    .eq("id", folderId);

  if (updateError) return actionError(updateError.message);

  revalidateVocabPaths(role, { folderId });
  return actionSuccess("폴더 이름이 수정되었습니다.");
}

export async function deleteVocabFolder(
  role: Role,
  folderId: string
): Promise<ActionResult> {
  const { profile, error } = await requireRole(role);
  if (error) return error;

  const supabase = await createClient();

  if (role === "teacher") {
    const { data: folder } = await supabase
      .from("vocab_folders")
      .select("id")
      .eq("id", folderId)
      .or(`teacher_id.eq.${profile!.id},created_by.eq.${profile!.id}`)
      .maybeSingle();

    if (!folder) {
      return actionError("이 폴더를 삭제할 권한이 없습니다.");
    }
  }

  const { error: deleteError } = await supabase
    .from("vocab_folders")
    .delete()
    .eq("id", folderId);

  if (deleteError) return actionError(deleteError.message);

  revalidateVocabPaths(role);
  return actionSuccess(
    "폴더가 삭제되었습니다. 폴더 안 단어장은 유지되며 폴더 없음으로 이동됩니다."
  );
}
