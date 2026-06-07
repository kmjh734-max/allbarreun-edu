import { createClient } from "@/lib/supabase/server";
import { canViewStudentReport } from "@/lib/reports/access";
import type { UserRole } from "@/types/database";

export async function resolveStudentRecordTarget(params: {
  role: UserRole;
  profileId: string;
  studentId: string;
  manualName: string;
}): Promise<
  | { ok: true; studentId: string | null; studentName: string }
  | { ok: false; message: string; status: number }
> {
  const { role, profileId, studentId, manualName } = params;
  let resolvedStudentId: string | null = null;
  let studentName = manualName || "학생";

  if (!studentId) {
    return { ok: true, studentId: null, studentName };
  }

  const supabase = await createClient();
  const allowed = await canViewStudentReport(
    supabase,
    role,
    profileId,
    studentId
  );
  if (!allowed) {
    return {
      ok: false,
      message: "해당 학생 자료에 접근할 수 없습니다.",
      status: 403,
    };
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (!student) {
    return { ok: false, message: "학생을 찾을 수 없습니다.", status: 200 };
  }

  resolvedStudentId = studentId;
  studentName = (student.name as string) || studentName;
  return { ok: true, studentId: resolvedStudentId, studentName };
}
