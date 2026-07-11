import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabStageProgress } from "@/types/database";

const HUB_PROGRESS_COLUMNS =
  "id, student_id, set_id, stage1_completed, stage2_completed, stage3_completed, stage4_passed, stage4_last_score, stage4_best_score, stage4_attempt_count, stage3_passed, stage3_last_score, stage3_best_score, stage3_attempt_count";

const STAGE1_PROGRESS_COLUMNS =
  "id, student_id, set_id, stage1_completed, stage1_seen_item_ids, stage2_completed, stage3_completed";

export function emptyStageProgress(
  studentId: string,
  setId: string
): VocabStageProgress {
  return {
    id: "",
    student_id: studentId,
    set_id: setId,
    stage1_completed: false,
    stage1_completed_at: null,
    stage1_seen_item_ids: [],
    stage2_completed: false,
    stage2_completed_at: null,
    stage3_completed: false,
    stage3_completed_at: null,
    stage3_passed: false,
    stage3_best_score: 0,
    stage3_last_score: 0,
    stage3_attempt_count: 0,
    stage3_passed_at: null,
    stage4_passed: false,
    stage4_best_score: 0,
    stage4_last_score: 0,
    stage4_attempt_count: 0,
    stage4_passed_at: null,
    created_at: "",
    updated_at: "",
  };
}

export type StageProgressLoad = "hub" | "stage1" | "full";

export async function loadStageProgress(
  supabase: SupabaseClient,
  studentId: string,
  setId: string,
  options?: { createIfMissing?: boolean; fields?: StageProgressLoad }
): Promise<VocabStageProgress> {
  const createIfMissing = options?.createIfMissing ?? true;
  const fields = options?.fields ?? "full";

  let data: VocabStageProgress | null = null;
  if (fields === "hub") {
    const { data: row } = await supabase
      .from("vocab_stage_progress")
      .select(HUB_PROGRESS_COLUMNS)
      .eq("student_id", studentId)
      .eq("set_id", setId)
      .maybeSingle();
    data = row as VocabStageProgress | null;
  } else if (fields === "stage1") {
    const { data: row } = await supabase
      .from("vocab_stage_progress")
      .select(STAGE1_PROGRESS_COLUMNS)
      .eq("student_id", studentId)
      .eq("set_id", setId)
      .maybeSingle();
    data = row as VocabStageProgress | null;
  } else {
    const { data: row } = await supabase
      .from("vocab_stage_progress")
      .select("*")
      .eq("student_id", studentId)
      .eq("set_id", setId)
      .maybeSingle();
    data = row as VocabStageProgress | null;
  }

  if (data) return data;

  if (!createIfMissing) {
    return emptyStageProgress(studentId, setId);
  }

  const { data: inserted, error } = await supabase
    .from("vocab_stage_progress")
    .insert({ student_id: studentId, set_id: setId })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "진행 상태를 만들 수 없습니다.");
  }

  return inserted as VocabStageProgress;
}

export function stage2Unlocked(progress: VocabStageProgress): boolean {
  return progress.stage1_completed;
}

export function stage3Unlocked(progress: VocabStageProgress): boolean {
  return progress.stage2_completed;
}

export function stage4Unlocked(progress: VocabStageProgress): boolean {
  return progress.stage3_completed;
}
