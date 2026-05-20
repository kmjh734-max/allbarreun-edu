/** Minimum interval between progress API saves (ms). */
export const PROGRESS_SAVE_INTERVAL_MS = 5_000;

/** Minimum % increase to trigger a save (e.g. 3% → saved). */
export const PROGRESS_SAVE_MIN_DELTA = 1;

export const COMPLETION_THRESHOLD = 0.9;

export function progressPercentFromVimeo(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent * 100)));
}

/**
 * Whether to persist progress to the server (not for completion events).
 * Saves when 시청률/시청 초가 늘었을 때(1%p 이상) 또는 5초마다.
 */
export function shouldPersistProgress(
  progressPercent: number,
  watchedSeconds: number,
  lastSaveTimeMs: number,
  lastSavedPercent: number,
  lastSavedSeconds: number,
  nowMs: number = Date.now()
): boolean {
  if (progressPercent - lastSavedPercent >= PROGRESS_SAVE_MIN_DELTA) {
    return true;
  }
  if (watchedSeconds > lastSavedSeconds) {
    return true;
  }
  if (nowMs - lastSaveTimeMs >= PROGRESS_SAVE_INTERVAL_MS) {
    return true;
  }
  return false;
}
