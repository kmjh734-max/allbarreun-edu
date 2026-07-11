import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabTestType } from "@/lib/vocab/test-types";
import { vocabTestTypeLabel } from "@/lib/vocab/test-types";

export interface SetTestResultRow {
  id: string;
  student_id: string;
  student_name: string;
  test_type: VocabTestType;
  test_type_label: string;
  score: number;
  correct_count: number;
  total_questions: number;
  submitted_at: string | null;
}

export async function loadSetTestResults(
  supabase: SupabaseClient,
  setId: string,
  limit = 50
): Promise<SetTestResultRow[]> {
  const { data, error } = await supabase
    .from("vocab_test_attempts")
    .select(
      "id, student_id, test_type, score, correct_count, total_questions, submitted_at, student:profiles!vocab_test_attempts_student_id_fkey(name)"
    )
    .eq("set_id", setId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    const testType = row.test_type as VocabTestType;
    return {
      id: row.id as string,
      student_id: row.student_id as string,
      student_name: (student as { name?: string } | null)?.name ?? "—",
      test_type: testType,
      test_type_label: vocabTestTypeLabel(testType),
      score: row.score as number,
      correct_count: row.correct_count as number,
      total_questions: row.total_questions as number,
      submitted_at: row.submitted_at as string | null,
    };
  });
}
