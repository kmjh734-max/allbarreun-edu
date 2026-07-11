import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabFinalTestAnswer, VocabFinalTestAttempt } from "@/types/database";

export interface FinalAttemptDetail {
  attempt: VocabFinalTestAttempt;
  answers: VocabFinalTestAnswer[];
  setTitle: string;
}

export async function loadLatestFinalAttemptDetail(
  supabase: SupabaseClient,
  setId: string,
  studentId: string
): Promise<FinalAttemptDetail | null> {
  const { data: attempt } = await supabase
    .from("vocab_final_test_attempts")
    .select("*")
    .eq("set_id", setId)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt) return null;

  const [{ data: answers }, { data: set }] = await Promise.all([
    supabase
      .from("vocab_final_test_answers")
      .select("*")
      .eq("attempt_id", attempt.id)
      .order("created_at"),
    supabase
      .from("vocab_sets")
      .select("title")
      .eq("id", attempt.set_id)
      .single(),
  ]);

  return {
    attempt: attempt as VocabFinalTestAttempt,
    answers: (answers ?? []) as VocabFinalTestAnswer[],
    setTitle: (set?.title as string) ?? "단어장",
  };
}

export async function loadFinalAttemptDetail(
  supabase: SupabaseClient,
  attemptId: string,
  studentId: string
): Promise<FinalAttemptDetail | null> {
  const { data: attempt } = await supabase
    .from("vocab_final_test_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("student_id", studentId)
    .single();

  if (!attempt) return null;

  const [{ data: answers }, { data: set }] = await Promise.all([
    supabase
      .from("vocab_final_test_answers")
      .select("*")
      .eq("attempt_id", attemptId)
      .order("created_at"),
    supabase
      .from("vocab_sets")
      .select("title")
      .eq("id", attempt.set_id)
      .single(),
  ]);

  return {
    attempt: attempt as VocabFinalTestAttempt,
    answers: (answers ?? []) as VocabFinalTestAnswer[],
    setTitle: (set?.title as string) ?? "단어장",
  };
}
