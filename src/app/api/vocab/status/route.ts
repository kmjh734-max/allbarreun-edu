import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getTodayIsoKorea } from "@/lib/date/korea-today";
import { loadVocabTodayStatusTable } from "@/lib/vocab/load-today-status-table";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
    return NextResponse.json(
      { ok: false, message: "권한이 없습니다." },
      { status: 403 }
    );
  }

  if (profile.role === "teacher" && profile.is_active === false) {
    return NextResponse.json(
      { ok: false, message: "비활성화된 계정입니다." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dateIso = searchParams.get("date")?.trim() || getTodayIsoKorea();
  const classId = searchParams.get("classId") ?? undefined;
  const nameQuery = searchParams.get("name") ?? "";
  const loginQuery = searchParams.get("loginId") ?? "";

  const supabase = await createClient();
  const table = await loadVocabTodayStatusTable(
    supabase,
    profile.role,
    profile.id,
    {
      dateIso,
      classId,
      nameQuery,
      loginQuery,
    }
  );

  return NextResponse.json({
    ok: true,
    table,
  });
}
