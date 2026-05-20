"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  addStudentToClass,
  assignCourseToClass,
  removeCourseFromClass,
  removeStudentFromClass,
  type ClassActionResult,
} from "@/lib/classes/class-assignments";

async function requireAdmin(): Promise<
  | { ok: true; profileId: string }
  | { ok: false; message: string }
> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { ok: false, message: "관리자 권한이 필요합니다." };
  }
  return { ok: true, profileId: profile.id };
}

function revalidateClassPaths(classId?: string) {
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/student");
  if (classId) {
    revalidatePath(`/admin/classes/${classId}`);
  }
}

export async function createClass(input: {
  name: string;
  description?: string;
  teacherId?: string;
  isActive?: boolean;
}): Promise<ClassActionResult & { classId?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.message };

  const name = input.name?.trim();
  if (!name) {
    return { ok: false, message: "반 이름을 입력해 주세요." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({
      name,
      description: input.description?.trim() || null,
      teacher_id: input.teacherId || null,
      created_by: auth.profileId,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "반 생성에 실패했습니다." };
  }

  revalidateClassPaths(data.id);
  return { ok: true, message: "반이 생성되었습니다.", classId: data.id };
}

export async function updateClass(
  classId: string,
  input: {
    name?: string;
    description?: string;
    teacherId?: string;
    isActive?: boolean;
  }
): Promise<ClassActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.message };

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) {
    payload.description = input.description.trim() || null;
  }
  if (input.teacherId !== undefined) {
    payload.teacher_id = input.teacherId || null;
  }
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update(payload)
    .eq("id", classId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateClassPaths(classId);
  return { ok: true, message: "반 정보가 저장되었습니다." };
}

export async function adminAddStudentToClass(
  classId: string,
  studentId: string
): Promise<ClassActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.message };

  const admin = createAdminClient();
  const result = await addStudentToClass(admin, {
    classId,
    studentId,
    assignedBy: auth.profileId,
  });

  if (result.ok) revalidateClassPaths(classId);
  return result;
}

export async function adminRemoveStudentFromClass(
  classId: string,
  studentId: string
): Promise<ClassActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();
  const result = await removeStudentFromClass(supabase, classId, studentId);

  if (result.ok) revalidateClassPaths(classId);
  return result;
}

export async function adminAssignCourseToClass(
  classId: string,
  courseId: string
): Promise<ClassActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.message };

  const admin = createAdminClient();
  const result = await assignCourseToClass(admin, {
    classId,
    courseId,
    assignedBy: auth.profileId,
    allowAnyCourse: true,
  });

  if (result.ok) revalidateClassPaths(classId);
  return result;
}

export async function adminRemoveCourseFromClass(
  classId: string,
  courseId: string
): Promise<ClassActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.message };

  const supabase = await createClient();
  const result = await removeCourseFromClass(supabase, classId, courseId);

  if (result.ok) revalidateClassPaths(classId);
  return result;
}
