import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getAdminClientSafe } from "@/lib/admin/api-json";
import { upsertLessonProgress } from "@/lib/lesson-progress/persist-progress";

export const runtime = "nodejs";

interface ProgressBody {
  lessonId?: string;
  watchedSeconds?: number;
  progressPercent?: number;
  isCompleted?: boolean;
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "student") {
      return NextResponse.json(
        { ok: false, message: "학생 권한이 필요합니다." },
        { status: 403 }
      );
    }

    let body: ProgressBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const lessonId = body.lessonId;
    if (!lessonId) {
      return NextResponse.json(
        { ok: false, message: "lessonId가 필요합니다." },
        { status: 400 }
      );
    }

    const watchedSeconds = Math.max(
      0,
      Math.floor(Number(body.watchedSeconds) || 0)
    );
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.floor(Number(body.progressPercent) || 0))
    );
    const markCompleted = body.isCompleted === true;

    const supabase = await createClient();

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, course_id, is_published")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { ok: false, message: "영상을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!lesson.is_published) {
      return NextResponse.json(
        { ok: false, message: "수강할 수 없는 영상입니다." },
        { status: 403 }
      );
    }

    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", profile.id)
      .eq("course_id", lesson.course_id)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { ok: false, message: "수강 중인 강좌가 아닙니다." },
        { status: 403 }
      );
    }

    const adminResult = getAdminClientSafe();
    if (!adminResult.ok) {
      const fallback = await upsertLessonProgress(supabase, {
        studentId: profile.id,
        lessonId,
        watchedSeconds,
        progressPercent,
        markCompleted,
      });
      if (!fallback.ok) {
        return NextResponse.json(
          { ok: false, message: fallback.message ?? "저장에 실패했습니다." },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        isCompleted: fallback.isCompleted,
        progressPercent: fallback.progressPercent,
        watchedSeconds: fallback.watchedSeconds,
      });
    }

    const result = await upsertLessonProgress(adminResult.admin, {
      studentId: profile.id,
      lessonId,
      watchedSeconds,
      progressPercent,
      markCompleted,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message ?? "저장에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      isCompleted: result.isCompleted,
      progressPercent: result.progressPercent,
      watchedSeconds: result.watchedSeconds,
    });
  } catch (error) {
    console.error("[POST /api/student/lesson-progress]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
