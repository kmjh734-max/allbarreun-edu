import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { listReportClasses, listReportStudents } from "@/lib/reports/list-students";

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

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") ?? undefined;
  const nameQuery = searchParams.get("name") ?? "";
  const loginQuery = searchParams.get("loginId") ?? "";

  const [classes, students] = await Promise.all([
    listReportClasses(supabase, profile.role, profile.id),
    listReportStudents(supabase, profile.role, profile.id, {
      classId,
      nameQuery,
      loginQuery,
    }),
  ]);

  return NextResponse.json({ ok: true, classes, students });
}
