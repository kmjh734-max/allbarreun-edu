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

    const fetchList = (columns: string) => {
      let query = admin
        .from("student_record_analyses")
        .select(columns)
        .order("created_at", { ascending: false })
        .limit(100);
      if (profile.role === "teacher") {
        query = query.eq("created_by", profile.id);
      }
      return query;
    };

    let { data, error } = await fetchList(
      "id, student_name, school, generated_at, created_at"
    );
    // school 컬럼 미적용(마이그레이션 전) 환경 호환
    if (error && /school/i.test(error.message)) {
      ({ data, error } = await fetchList(
        "id, student_name, generated_at, created_at"
      ));
    }

    if (error) {
      console.error("[student-records/history] list failed:", error.message);
      return NextResponse.json(
        { ok: false, message: "분석 기록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    type Row = {
      id: string;
      student_name: string | null;
      school?: string | null;
      generated_at: string;
      created_at: string;
    };

    return NextResponse.json({
      ok: true,
      records: ((data ?? []) as unknown as Row[]).map((row) => ({
        id: row.id,
        studentName: row.student_name ?? "학생",
        school: row.school ?? null,
        generatedAt: row.generated_at,
        createdAt: row.created_at,
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
