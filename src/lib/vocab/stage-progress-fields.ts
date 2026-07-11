import type { VocabStageProgress } from "@/types/database";

export function stage3Completed(progress: VocabStageProgress): boolean {
  return Boolean(progress.stage3_completed);
}

export function stage4Passed(progress: VocabStageProgress): boolean {
  if (progress.stage4_passed) return true;
  if ((progress.stage4_attempt_count ?? 0) > 0) {
    return Boolean(progress.stage4_passed);
  }
  return Boolean(progress.stage3_passed);
}

export function stage4LastScore(progress: VocabStageProgress): number {
  if ((progress.stage4_attempt_count ?? 0) > 0) {
    return progress.stage4_last_score ?? 0;
  }
  return progress.stage3_last_score ?? 0;
}

export function stage4BestScore(progress: VocabStageProgress): number {
  if ((progress.stage4_attempt_count ?? 0) > 0) {
    return progress.stage4_best_score ?? 0;
  }
  return Math.max(
    progress.stage4_best_score ?? 0,
    progress.stage3_best_score ?? 0
  );
}

export function stage4AttemptCount(progress: VocabStageProgress): number {
  const s4 = progress.stage4_attempt_count ?? 0;
  if (s4 > 0) return s4;
  return progress.stage3_attempt_count ?? 0;
}
