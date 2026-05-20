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

async function requireTeacher(): Promise<
  | { ok: true; profileId: string }
  | { ok: false; message: string }
> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return { ok: false, message: "강사 권한이 필요합니다." };
  }
  if (profile.is_active === false) {
    return { ok: false, message: "비활성화된 계정입니다." };
  }
  return { ok: true, profileId: profile.id };
}

async function assertTeacherOwnsClass(
  teacherId: string,
  classId: string
): Promise<ClassActionResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: "담당 반만 관리할 수 있습니다." };
  }
  return null;
}

function revalidateTeacherClassPaths(classId?: string) {
  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/students");
  revalidatePath("/student");
  if (classId) {
    revalidatePath(`/teacher/classes/${classId}`);
  }
}

export async function teacherAddStudentToClass(
  classId: string,
  studentId: string
): Promise<ClassActionResult> {
  const auth = await requireTeacher();
  if (!auth.ok) return { ok: false, message: auth.message };

  const denied = await assertTeacherOwnsClass(auth.profileId, classId);
  if (denied) return denied;

  const { data: student } = await (await createClient())
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .eq("role", "student")
    .eq("created_by", auth.profileId)
    .maybeSingle();

  if (!student) {
    return {
      ok: false,
      message: "본인이 등록한 학생만 반에 추가할 수 있습니다.",
    };
  }

  const admin = createAdminClient();
  const result = await addStudentToClass(admin, {
    classId,
    studentId,
    assignedBy: auth.profileId,
  });

  if (result.ok) revalidateTeacherClassPaths(classId);
  return result;
}

export async function teacherRemoveStudentFromClass(
  classId: string,
  studentId: string
): Promise<ClassActionResult> {
  const auth = await requireTeacher();
  if (!auth.ok) return { ok: false, message: auth.message };

  const denied = await assertTeacherOwnsClass(auth.profileId, classId);
  if (denied) return denied;

  const supabase = await createClient();
  const result = await removeStudentFromClass(supabase, classId, studentId);

  if (result.ok) revalidateTeacherClassPaths(classId);
  return result;
}

export async function teacherAssignCourseToClass(
  classId: string,
  courseId: string
): Promise<ClassActionResult> {
  const auth = await requireTeacher();
  if (!auth.ok) return { ok: false, message: auth.message };

  const denied = await assertTeacherOwnsClass(auth.profileId, classId);
  if (denied) return denied;

  const admin = createAdminClient();
  const result = await assignCourseToClass(admin, {
    classId,
    courseId,
    assignedBy: auth.profileId,
    allowAnyCourse: false,
  });

  if (result.ok) revalidateTeacherClassPaths(classId);
  return result;
}

export async function teacherRemoveCourseFromClass(
  classId: string,
  courseId: string
): Promise<ClassActionResult> {
  const auth = await requireTeacher();
  if (!auth.ok) return { ok: false, message: auth.message };

  const denied = await assertTeacherOwnsClass(auth.profileId, classId);
  if (denied) return denied;

  const supabase = await createClient();
  const result = await removeCourseFromClass(supabase, classId, courseId);

  if (result.ok) revalidateTeacherClassPaths(classId);
  return result;
}
