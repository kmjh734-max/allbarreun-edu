import { NextResponse } from "next/server";
import { adminJsonError, getAdminClientSafe } from "@/lib/admin/api-json";
import { insertCourseLessons } from "@/lib/courses/lesson-save-server";
import { resolveLessonTeacherId } from "@/lib/courses/resolve-lesson-teacher-id";
import { requireTeacherApi } from "@/lib/auth/require-teacher-api";
import type { VideoDraftRow } from "@/lib/courses/course-lessons";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireTeacherApi();
    if ("error" in auth && auth.error) {
      return auth.error;
    }

    const clientResult = getAdminClientSafe();
    if (!clientResult.ok) {
      return clientResult.response;
    }

    const { courseId } = await context.params;

    const { data: course, error: courseError } = await auth.supabase
      .from("courses")
      .select("teacher_id")
      .eq("id", courseId)
      .eq("teacher_id", auth.profile.id)
      .single();

    if (courseError || !course) {
      return adminJsonError("담당 강좌가 아니거나 강좌를 찾을 수 없습니다.", 403);
    }

    let body: { rows?: VideoDraftRow[] };
    try {
      body = await request.json();
    } catch {
      return adminJsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    const rows = body.rows ?? [];
    if (rows.length === 0) {
      return adminJsonError("저장할 영상이 없습니다.", 400);
    }

    const teacherId = resolveLessonTeacherId(
      course.teacher_id,
      auth.profile.id
    );

    const result = await insertCourseLessons(
      clientResult.admin,
      courseId,
      teacherId,
      rows
    );

    if (!result.ok) {
      return adminJsonError(result.message, 400);
    }

    return NextResponse.json({ ok: true, lessons: result.lessons });
  } catch (error) {
    console.error("[POST /api/teacher/courses/.../lessons]", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
