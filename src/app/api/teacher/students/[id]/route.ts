import { NextResponse } from "next/server";
import { adminJsonError, getAdminClientSafe } from "@/lib/admin/api-json";
import { updateManagedAccount } from "@/lib/admin/manage-user";
import { requireTeacherApi } from "@/lib/auth/require-teacher-api";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireTeacherApi();
    if ("error" in auth && auth.error) {
      return auth.error;
    }

    const clientResult = getAdminClientSafe();
    if (!clientResult.ok) {
      return clientResult.response;
    }

    const { id } = await context.params;

    let body: { name?: string; is_active?: boolean };
    try {
      body = await request.json();
    } catch {
      return adminJsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    const result = await updateManagedAccount(
      clientResult.admin,
      id,
      "student",
      {
        name: body.name,
        is_active: body.is_active,
        allowUsernameChange: false,
        restrictToCreatorId: auth.profile.id,
      }
    );

    if (!result.ok) {
      return adminJsonError(result.message, result.status);
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      student: result.profile,
    });
  } catch (error) {
    console.error("[PATCH /api/teacher/students/[id]] unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
