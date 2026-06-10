import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function loadAccessibleRecord(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
    return { error: NextResponse.json({ ok: false, message: "권한이 없습니다." }, { status: 403 }) };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("student_record_analyses")
    .select("id, student_id, student_name, html, generated_at, created_by")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { error: NextResponse.json({ ok: false, message: "기록을 찾을 수 없습니다." }, { status: 404 }) };
  }

  if (profile.role === "teacher" && data.created_by !== profile.id) {
    return { error: NextResponse.json({ ok: false, message: "본인 기록만 접근할 수 있습니다." }, { status: 403 }) };
  }

  return { admin, data };
}

/** 분석 기록 열람 (HTML 포함) */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await loadAccessibleRecord(id);
    if (result.error) return result.error;

    const { data } = result;
    return NextResponse.json({
      ok: true,
      record: {
        id: data.id as string,
        studentId: (data.student_id as string | null) ?? null,
        studentName: (data.student_name as string) ?? "학생",
        html: data.html as string,
        generatedAt: data.generated_at as string,
      },
    });
  } catch (e) {
    console.error("[student-records/history/:id] GET error:", e);
    return NextResponse.json(
      { ok: false, message: "기록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

/** 분석 기록 제목 수정 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await loadAccessibleRecord(id);
    if (result.error) return result.error;

    let body: { title?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const title = body.title?.trim();
    if (!title || title.length > 100) {
      return NextResponse.json(
        { ok: false, message: "제목은 1~100자로 입력해 주세요." },
        { status: 400 }
      );
    }

    // 사용자가 입력한 제목을 그대로 표시하도록 school은 비운다
    const { error } = await result.admin
      .from("student_record_analyses")
      .update({ student_name: title, school: null })
      .eq("id", id);

    if (error) {
      console.error("[student-records/history/:id] update failed:", error.message);
      return NextResponse.json(
        { ok: false, message: "제목 수정에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, title });
  } catch (e) {
    console.error("[student-records/history/:id] PATCH error:", e);
    return NextResponse.json(
      { ok: false, message: "제목 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

/** 분석 기록 삭제 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await loadAccessibleRecord(id);
    if (result.error) return result.error;

    const { error } = await result.admin
      .from("student_record_analyses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[student-records/history/:id] delete failed:", error.message);
      return NextResponse.json(
        { ok: false, message: "기록 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[student-records/history/:id] DELETE error:", e);
    return NextResponse.json(
      { ok: false, message: "기록 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
