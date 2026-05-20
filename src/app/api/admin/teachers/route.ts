import { NextResponse } from "next/server";
import { adminJsonError, getAdminClientSafe } from "@/lib/admin/api-json";
import { createManagedAccount } from "@/lib/admin/manage-user";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi();
    if ("error" in auth && auth.error) {
      return auth.error;
    }

    const clientResult = getAdminClientSafe();
    if (!clientResult.ok) {
      return clientResult.response;
    }

    let body: { name?: string; username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return adminJsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    const result = await createManagedAccount(clientResult.admin, {
      name: body.name ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
      role: "teacher",
      createdBy: auth.profile.id,
    });

    if (!result.ok) {
      return adminJsonError(result.message, result.status);
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      teacher: result.profile,
    });
  } catch (error) {
    console.error("[POST /api/admin/teachers] unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
