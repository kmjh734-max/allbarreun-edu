import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabStageProgressRow } from "@/components/vocab/VocabStageProgressTable";
import {
  stage3Completed as readStage3Completed,
  stage4AttemptCount,
  stage4BestScore,
  stage4LastScore,
  stage4Passed,
} from "@/lib/vocab/stage-progress-fields";
import type { VocabStageProgress } from "@/types/database";

export async function loadSetStageProgressRows(
  supabase: SupabaseClient,
  setId: string
): Promise<VocabStageProgressRow[]> {
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

  const [{ data: students }, { data: progressRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, login_id")
      .in("id", ids)
      .eq("role", "student")
      .order("name"),
    supabase
      .from("vocab_stage_progress")
      .select("*")
      .eq("set_id", setId)
      .in("student_id", ids),
  ]);

  const progressByStudent = new Map(
    (progressRows ?? []).map((p) => [p.student_id as string, p])
  );

  return (students ?? []).map((s) => {
    const p = progressByStudent.get(s.id) as VocabStageProgress | undefined;
    const progress: VocabStageProgress =
      p ??
      ({
        stage1_completed: false,
        stage2_completed: false,
        stage3_completed: false,
        stage4_passed: false,
        stage4_last_score: 0,
        stage4_best_score: 0,
        stage4_attempt_count: 0,
        stage3_passed: false,
        stage3_last_score: 0,
        stage3_best_score: 0,
        stage3_attempt_count: 0,
      } as VocabStageProgress);

    return {
      studentId: s.id,
      studentName: (s.name as string) || (s.login_id as string) || "—",
      stage1Completed: Boolean(progress.stage1_completed),
      stage2Completed: Boolean(progress.stage2_completed),
      stage3Completed: readStage3Completed(progress),
      stage4Passed: stage4Passed(progress),
      stage4LastScore: stage4LastScore(progress),
      stage4BestScore: stage4BestScore(progress),
      stage4AttemptCount: stage4AttemptCount(progress),
    };
  });
}
