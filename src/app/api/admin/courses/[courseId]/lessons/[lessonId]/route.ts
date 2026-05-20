import { NextResponse } from "next/server";
import { adminJsonError, getAdminClientSafe } from "@/lib/admin/api-json";
import {
  deleteCourseLesson,
  updateCourseLesson,
} from "@/lib/courses/lesson-save-server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth && auth.error) {
      return auth.error;
    }

    const clientResult = getAdminClientSafe();
    if (!clientResult.ok) {
      return clientResult.response;
    }

    const { courseId, lessonId } = await context.params;

    let body: { title?: string; videoUrl?: string; isPublished?: boolean };
    try {
      body = await request.json();
    } catch {
      return adminJsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    if (!body.title?.trim()) {
      return adminJsonError("동영상 제목을 입력해 주세요.", 400);
    }
    if (!body.videoUrl?.trim()) {
      return adminJsonError("동영상 링크를 입력해 주세요.", 400);
    }

    const result = await updateCourseLesson(
      clientResult.admin,
      lessonId,
      courseId,
      {
        title: body.title,
        videoUrl: body.videoUrl,
        isPublished: body.isPublished ?? true,
      }
    );

    if (!result.ok) {
      return adminJsonError(result.message, 400);
    }

    return NextResponse.json({ ok: true, lesson: result.lesson });
  } catch (error) {
    console.error("[PATCH /api/admin/courses/.../lessons/...]", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth && auth.error) {
      return auth.error;
    }

    const clientResult = getAdminClientSafe();
    if (!clientResult.ok) {
      return clientResult.response;
    }

    const { courseId, lessonId } = await context.params;

    const result = await deleteCourseLesson(
      clientResult.admin,
      lessonId,
      courseId
    );

    if (!result.ok) {
      return adminJsonError(result.message, 400);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/courses/.../lessons/...]", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
