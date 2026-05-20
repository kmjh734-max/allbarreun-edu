import { NextResponse } from "next/server";
import { adminJsonError, getAdminClientSafe } from "@/lib/admin/api-json";
import { requireTeacherApi } from "@/lib/auth/require-teacher-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherApi();
    if ("error" in auth && auth.error) {
      return auth.error;
    }

    const clientResult = getAdminClientSafe();
    if (!clientResult.ok) {
      return clientResult.response;
    }

    let body: { student_id?: string; course_id?: string };
    try {
      body = await request.json();
    } catch {
      return adminJsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    const studentId = body.student_id;
    const courseId = body.course_id;

    if (!studentId || !courseId) {
      return adminJsonError("학생과 강좌을 모두 선택해 주세요.", 400);
    }

    const admin = clientResult.admin;
    const teacherId = auth.profile.id;

    const { data: student } = await admin
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .eq("role", "student")
      .eq("created_by", teacherId)
      .maybeSingle();

    if (!student) {
      return adminJsonError(
        "본인이 등록한 학생만 강좌에 배정할 수 있습니다.",
        403
      );
    }

    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (!course) {
      return adminJsonError("담당 강좌만 선택할 수 있습니다.", 403);
    }

    const { data: existing } = await admin
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      return adminJsonError("이미 배정된 강좌입니다.", 409);
    }

    const { error: insertError } = await admin.from("enrollments").insert({
      student_id: studentId,
      course_id: courseId,
      assigned_by: teacherId,
    });

    if (insertError) {
      const duplicate =
        insertError.code === "23505" ||
        insertError.message.toLowerCase().includes("unique");
      return adminJsonError(
        duplicate ? "이미 배정된 강좌입니다." : insertError.message,
        400
      );
    }

    return NextResponse.json({
      ok: true,
      message: "강좌이 학생에게 배정되었습니다.",
    });
  } catch (error) {
    console.error("[POST /api/teacher/enrollments] unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
