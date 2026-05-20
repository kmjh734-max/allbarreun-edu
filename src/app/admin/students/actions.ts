"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export type AssignEnrollmentResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function assignEnrollment(
  studentId: string,
  courseId: string
): Promise<AssignEnrollmentResult> {
  if (!studentId || !courseId) {
    return { ok: false, message: "학생과 강좌를 모두 선택해 주세요." };
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { ok: false, message: "관리자 권한이 필요합니다." };
  }

  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, message: lookupError.message };
  }

  if (existing) {
    return { ok: false, message: "이미 배정된 강좌입니다." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("enrollments")
    .insert({
      student_id: studentId,
      course_id: courseId,
      assigned_by: profile.id,
    })
    .select("id, student_id, course_id, assigned_by")
    .single();

  if (insertError) {
    const duplicate =
      insertError.code === "23505" ||
      insertError.message.toLowerCase().includes("unique");
    return {
      ok: false,
      message: duplicate
        ? "이미 배정된 강좌입니다."
        : insertError.message,
    };
  }

  if (!inserted?.student_id || !inserted?.course_id) {
    return {
      ok: false,
      message: "배정은 완료되었으나 저장된 데이터를 확인할 수 없습니다.",
    };
  }

  revalidatePath("/admin/students");
  revalidatePath("/student");

  return { ok: true, message: "강좌가 학생에게 배정되었습니다." };
}
