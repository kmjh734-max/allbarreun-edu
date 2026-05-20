import { COMPLETION_THRESHOLD } from "@/lib/lesson-progress/save-throttle";

/** Max seconds the playhead may advance between ticks (covers ~2x speed + buffering). */
export const MAX_NATURAL_PLAYHEAD_JUMP_SEC = 8;

/** Allowed overshoot when comparing seek target to max watched position. */
export const SEEK_FORWARD_TOLERANCE_SEC = 0.5;

export function watchedPercentFromSeconds(
  watchedSeconds: number,
  duration: number
): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.round((watchedSeconds / duration) * 100));
}

export function watchedRatioFromSeconds(
  watchedSeconds: number,
  duration: number
): number {
  if (duration <= 0) return 0;
  return Math.min(1, watchedSeconds / duration);
}

export function isCompletionReached(
  watchedSeconds: number,
  duration: number
): boolean {
  return watchedRatioFromSeconds(watchedSeconds, duration) >= COMPLETION_THRESHOLD;
}

/**
 * Returns true if playhead advanced naturally (not a forward seek).
 * Rewinds always return true (allowed, does not extend max).
 */
export function isNaturalPlayheadAdvance(
  currentSeconds: number,
  previousTickSeconds: number
): boolean {
  if (currentSeconds <= previousTickSeconds) {
    return true;
  }
  return currentSeconds - previousTickSeconds <= MAX_NATURAL_PLAYHEAD_JUMP_SEC;
}

export function isForwardSeekBeyondMax(
  targetSeconds: number,
  maxWatchedSeconds: number
): boolean {
  return targetSeconds > maxWatchedSeconds + SEEK_FORWARD_TOLERANCE_SEC;
}
