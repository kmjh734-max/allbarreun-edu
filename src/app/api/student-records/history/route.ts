import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** 분석 기록 목록 — 강사는 본인 기록만, 관리자는 전체 */
export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return NextResponse.json(
        { ok: false, message: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    let query = admin
      .from("student_record_analyses")
      .select("id, student_name, generated_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (profile.role === "teacher") {
      query = query.eq("created_by", profile.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[student-records/history] list failed:", error.message);
      return NextResponse.json(
        { ok: false, message: "분석 기록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      records: (data ?? []).map((row) => ({
        id: row.id as string,
        studentName: (row.student_name as string) ?? "학생",
        generatedAt: row.generated_at as string,
        createdAt: row.created_at as string,
      })),
    });
  } catch (e) {
    console.error("[student-records/history] GET error:", e);
    return NextResponse.json(
      { ok: false, message: "분석 기록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
