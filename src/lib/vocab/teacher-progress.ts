import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentVocabProgressRow } from "@/components/vocab/TeacherVocabProgressTable";
import type { Profile, VocabProgress } from "@/types/database";

export async function buildTeacherVocabProgressRows(
  supabase: SupabaseClient,
  setId: string,
  itemIds: string[]
): Promise<StudentVocabProgressRow[]> {
  const { data: assignments } = await supabase
    .from("vocab_assignments")
    .select("student_id, class_id")
    .eq("set_id", setId);

  const studentIds = new Set<string>();

  for (const a of assignments ?? []) {
    if (a.student_id) studentIds.add(a.student_id);
  }

  const classIds = (assignments ?? [])
    .map((a) => a.class_id)
    .filter((id): id is string => Boolean(id));

  if (classIds.length > 0) {
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id")
      .in("class_id", classIds);

    for (const row of classStudents ?? []) {
      studentIds.add(row.student_id);
    }
  }

  if (studentIds.size === 0) return [];

  const ids = [...studentIds];

  const [{ data: students }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", ids).eq("role", "student"),
    itemIds.length > 0
      ? supabase
          .from("vocab_progress")
          .select("student_id, status")
          .in("student_id", ids)
          .in("item_id", itemIds)
      : { data: [] as Pick<VocabProgress, "student_id" | "status">[] },
  ]);

  const total = itemIds.length;

  return ((students ?? []) as Profile[]).map((student) => {
    const mine = (progress ?? []).filter((p) => p.student_id === student.id);
    const known = mine.filter((p) => p.status === "known").length;
    const review = mine.filter((p) => p.status === "review").length;
    return {
      student,
      known,
      review,
      studied: mine.length,
      total,
    };
  });
}
