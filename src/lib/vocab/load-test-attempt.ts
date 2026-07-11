import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabTestType } from "@/lib/vocab/test-types";
import { vocabTestTypeLabel } from "@/lib/vocab/test-types";

export interface TestAttemptDetail {
  id: string;
  set_id: string;
  set_title: string;
  student_id: string;
  test_type: VocabTestType;
  test_type_label: string;
  score: number;
  correct_count: number;
  total_questions: number;
  submitted_at: string | null;
}

export interface TestAnswerDetail {
  id: string;
  item_id: string;
  question_text: string | null;
  correct_answer: string | null;
  student_answer: string | null;
  is_correct: boolean;
  choices: string[] | null;
}

export async function loadTestAttemptDetail(
  supabase: SupabaseClient,
  attemptId: string,
  studentId: string
): Promise<{ attempt: TestAttemptDetail; answers: TestAnswerDetail[] } | null> {
  const { data: attemptRow } = await supabase
    .from("vocab_test_attempts")
    .select(
      "*, set:vocab_sets(title)"
    )
    .eq("id", attemptId)
    .eq("student_id", studentId)
    .single();

  if (!attemptRow) return null;

  const set = Array.isArray(attemptRow.set) ? attemptRow.set[0] : attemptRow.set;
  const testType = attemptRow.test_type as VocabTestType;

  const { data: answerRows } = await supabase
    .from("vocab_test_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("created_at");

  const attempt: TestAttemptDetail = {
    id: attemptRow.id as string,
    set_id: attemptRow.set_id as string,
    set_title: (set as { title?: string } | null)?.title ?? "—",
    student_id: attemptRow.student_id as string,
    test_type: testType,
    test_type_label: vocabTestTypeLabel(testType),
    score: attemptRow.score as number,
    correct_count: attemptRow.correct_count as number,
    total_questions: attemptRow.total_questions as number,
    submitted_at: attemptRow.submitted_at as string | null,
  };

  const answers: TestAnswerDetail[] = (answerRows ?? []).map((row) => ({
    id: row.id as string,
    item_id: row.item_id as string,
    question_text: row.question_text as string | null,
    correct_answer: row.correct_answer as string | null,
    student_answer: row.student_answer as string | null,
    is_correct: row.is_correct as boolean,
    choices: (row.choices as string[] | null) ?? null,
  }));

  return { attempt, answers };
}
