import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportClassOption, ReportStudentOption } from "@/lib/reports/types";
import type { UserRole } from "@/types/database";

function matchesSearch(
  student: ReportStudentOption,
  nameQuery: string,
  loginQuery: string
): boolean {
  const nameQ = nameQuery.trim().toLowerCase();
  const loginQ = loginQuery.trim().toLowerCase();

  if (nameQ && !student.name.toLowerCase().includes(nameQ)) return false;
  if (loginQ) {
    const login = (student.loginId ?? "").toLowerCase();
    if (!login.includes(loginQ)) return false;
  }
  return true;
}

export async function listReportClasses(
  supabase: SupabaseClient,
  role: UserRole,
  viewerId: string
): Promise<ReportClassOption[]> {
  let query = supabase.from("classes").select("id, name").order("name");

  if (role === "teacher") {
    query = query.eq("teacher_id", viewerId);
  }

  const { data } = await query;
  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));
}

export async function listReportStudents(
  supabase: SupabaseClient,
  role: UserRole,
  viewerId: string,
  filters: {
    classId?: string;
    nameQuery?: string;
    loginQuery?: string;
  }
): Promise<ReportStudentOption[]> {
  const classId = filters.classId?.trim();
  const nameQuery = filters.nameQuery ?? "";
  const loginQuery = filters.loginQuery ?? "";

  let studentIds: string[] | null = null;

  if (classId) {
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId);

    studentIds = (classStudents ?? []).map((r) => r.student_id as string);
    if (studentIds.length === 0) return [];
  }

  let profileQuery = supabase
    .from("profiles")
    .select("id, name, username")
    .eq("role", "student")
    .eq("is_active", true)
    .order("name");

  if (role === "teacher") {
    const [{ data: createdStudents }, { data: teacherClasses }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id")
          .eq("role", "student")
          .eq("created_by", viewerId),
        supabase.from("classes").select("id").eq("teacher_id", viewerId),
      ]);

    const allowed = new Set<string>(
      (createdStudents ?? []).map((s) => s.id as string)
    );

    const classIds = (teacherClasses ?? []).map((c) => c.id as string);
    if (classIds.length > 0) {
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);
      for (const row of classStudents ?? []) {
        allowed.add(row.student_id as string);
      }
    }

    if (allowed.size === 0) return [];

    if (studentIds) {
      studentIds = studentIds.filter((id) => allowed.has(id));
      if (studentIds.length === 0) return [];
    } else {
      studentIds = [...allowed];
    }
  }

  if (studentIds) {
    profileQuery = profileQuery.in("id", studentIds);
  }

  const { data: profiles } = await profileQuery;
  if (!profiles?.length) return [];

  const ids = profiles.map((p) => p.id as string);

  const { data: classLinks } = await supabase
    .from("class_students")
    .select("student_id, class:classes(name)")
    .in("student_id", ids);

  const classesByStudent = new Map<string, string[]>();
  for (const link of classLinks ?? []) {
    const studentId = link.student_id as string;
    const className = Array.isArray(link.class)
      ? (link.class[0]?.name as string | undefined)
      : ((link.class as { name?: string } | null)?.name ?? undefined);
    if (!className) continue;
    const list = classesByStudent.get(studentId) ?? [];
    list.push(className);
    classesByStudent.set(studentId, list);
  }

  const options: ReportStudentOption[] = profiles.map((p) => ({
    id: p.id as string,
    name: (p.name as string) || "—",
    loginId: (p.username as string | null) ?? null,
    classNames: classesByStudent.get(p.id as string) ?? [],
  }));

  return options.filter((s) => matchesSearch(s, nameQuery, loginQuery));
}
