import type { SupabaseClient } from "@supabase/supabase-js";

/** Student has direct or class-based assignment to a vocab set. */
export async function isStudentAssignedToVocabSet(
  supabase: SupabaseClient,
  studentId: string,
  setId: string
): Promise<boolean> {
  const [{ data: direct }, { data: classMemberships }] = await Promise.all([
    supabase
      .from("vocab_assignments")
      .select("id")
      .eq("student_id", studentId)
      .eq("set_id", setId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId),
  ]);

  if (direct) return true;

  const classIds = (classMemberships ?? []).map((r) => r.class_id);
  if (classIds.length === 0) return false;

  const { data: classAssignment } = await supabase
    .from("vocab_assignments")
    .select("id")
    .eq("set_id", setId)
    .in("class_id", classIds)
    .limit(1)
    .maybeSingle();

  return Boolean(classAssignment);
}
