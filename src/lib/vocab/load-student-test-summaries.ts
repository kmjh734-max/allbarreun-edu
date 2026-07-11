import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabTestType } from "@/lib/vocab/test-types";

export interface LatestVocabTestSummary {
  setId: string;
  score: number;
  testType: VocabTestType;
  submittedAt: string;
}

export async function fetchLatestTestBySet(
  supabase: SupabaseClient,
  studentId: string,
  setIds: string[]
): Promise<Map<string, LatestVocabTestSummary>> {
  if (setIds.length === 0) return new Map();

  const { data } = await supabase
    .from("vocab_test_attempts")
    .select("set_id, test_type, score, submitted_at")
    .eq("student_id", studentId)
    .in("set_id", setIds)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const map = new Map<string, LatestVocabTestSummary>();
  for (const row of data ?? []) {
    const setId = row.set_id as string;
    if (map.has(setId)) continue;
    map.set(setId, {
      setId,
      score: row.score as number,
      testType: row.test_type as VocabTestType,
      submittedAt: row.submitted_at as string,
    });
  }
  return map;
}
