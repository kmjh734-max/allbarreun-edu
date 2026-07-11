"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/vocab/actions-shared";
import {
  bulkAssignFolderSets,
  formatBulkAssignSuccess,
} from "@/lib/vocab/folder-assignments";
import { bulkAssignSets } from "@/lib/vocab/bulk-assign-sets";
import { removeVocabAssignment } from "@/lib/vocab/class-assignments";
import { revalidateVocabPaths } from "@/lib/vocab/revalidate";

const ROLE = "admin" as const;

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { profile: null, error: actionError("관리자 권한이 필요합니다.") };
  }
  return { profile, error: null };
}

export async function assignFolderToClass(
  folderId: string,
  classId: string
): Promise<ActionResult> {
  const { profile, error } = await requireAdmin();
  if (error) return error;

  const supabase = await createClient();
  const result = await bulkAssignFolderSets(supabase, folderId, profile!.id, {
    classId,
  });

  if (!result.ok) return actionError(result.message);

  revalidateVocabPaths(ROLE, { folderId, classId });
  return actionSuccess(formatBulkAssignSuccess(result));
}

export async function assignFolderToStudents(
  folderId: string,
  studentIds: string[],
  classId?: string
): Promise<ActionResult> {
  const { profile, error } = await requireAdmin();
  if (error) return error;

  if (!studentIds.length) {
    return actionError("배정할 학생을 선택해 주세요.");
  }

  const supabase = await createClient();
  const result = await bulkAssignFolderSets(supabase, folderId, profile!.id, {
    classId,
    studentIds,
  });

  if (!result.ok) return actionError(result.message);

  revalidateVocabPaths(ROLE, { folderId, classId });
  return actionSuccess(formatBulkAssignSuccess(result));
}

export async function assignSetToClass(
  setId: string,
  classId: string
): Promise<ActionResult> {
  const { profile, error } = await requireAdmin();
  if (error) return error;

  const supabase = await createClient();
  const result = await bulkAssignSets(supabase, [setId], profile!.id, {
    classId,
  });

  if (!result.ok) return actionError(result.message);
  revalidateVocabPaths(ROLE, { setId, classId });
  return actionSuccess(formatBulkAssignSuccess(result));
}

export async function assignSetToStudents(
  setId: string,
  studentIds: string[],
  classId?: string
): Promise<ActionResult> {
  const { profile, error } = await requireAdmin();
  if (error) return error;

  if (!studentIds.length) {
    return actionError("배정할 학생을 선택해 주세요.");
  }

  const supabase = await createClient();
  const result = await bulkAssignSets(supabase, [setId], profile!.id, {
    classId,
    studentIds,
  });

  if (!result.ok) return actionError(result.message);
  revalidateVocabPaths(ROLE, { setId, classId });
  return actionSuccess(formatBulkAssignSuccess(result));
}

export async function removeSetAssignment(
  assignmentId: string,
  setId: string
): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabase = await createClient();
  const result = await removeVocabAssignment(supabase, assignmentId);

  if (!result.ok) return actionError(result.message);

  revalidateVocabPaths(ROLE, { setId });
  return actionSuccess("배정이 해제되었습니다.");
}

export async function removeFolderVocabAssignment(
  assignmentId: string,
  folderId: string
): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabase = await createClient();
  const result = await removeVocabAssignment(supabase, assignmentId);

  if (!result.ok) return actionError(result.message);

  revalidateVocabPaths(ROLE, { folderId });
  return actionSuccess("배정이 해제되었습니다.");
}

export async function bulkAssignVocabSetsToClass(
  setIds: string[],
  classId: string
): Promise<ActionResult> {
  const { profile, error } = await requireAdmin();
  if (error) return error;
  if (!setIds.length) return actionError("배정할 단어장을 선택해 주세요.");

  const supabase = await createClient();
  const result = await bulkAssignSets(supabase, setIds, profile!.id, {
    classId,
  });

  if (!result.ok) return actionError(result.message);
  revalidateVocabPaths(ROLE, { classId });
  return actionSuccess(formatBulkAssignSuccess(result));
}

export async function bulkAssignVocabSetsToStudents(
  setIds: string[],
  studentIds: string[],
  classId?: string
): Promise<ActionResult> {
  const { profile, error } = await requireAdmin();
  if (error) return error;
  if (!setIds.length) return actionError("배정할 단어장을 선택해 주세요.");
  if (!studentIds.length) return actionError("배정할 학생을 선택해 주세요.");

  const supabase = await createClient();
  const result = await bulkAssignSets(supabase, setIds, profile!.id, {
    classId,
    studentIds,
  });

  if (!result.ok) return actionError(result.message);
  revalidateVocabPaths(ROLE, { classId });
  return actionSuccess(formatBulkAssignSuccess(result));
}
