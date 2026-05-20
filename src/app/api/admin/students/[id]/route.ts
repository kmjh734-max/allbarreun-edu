import { NextResponse } from "next/server";
import { adminJsonError, getAdminClientSafe } from "@/lib/admin/api-json";
import {
  deleteManagedAccount,
  updateManagedAccount,
} from "@/lib/admin/manage-user";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
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

    const { id } = await context.params;

    let body: {
      name?: string;
      username?: string;
      is_active?: boolean;
    };

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
        username: body.username,
        is_active: body.is_active,
        allowUsernameChange: true,
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
    console.error("[PATCH /api/admin/students/[id]] unexpected error:", error);
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

    const { id } = await context.params;

    const result = await deleteManagedAccount(
      clientResult.admin,
      id,
      "student"
    );

    if (!result.ok) {
      return adminJsonError(result.message, result.status);
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[DELETE /api/admin/students/[id]] unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
