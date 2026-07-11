export type ExamGuestProgress = {
  stage1Done: boolean;
  stage1Seen: string[];
  stage2Done: boolean;
  stage4Best: number;
  stage4Passed: boolean;
  stage4Last: number;
  stage4Attempts: number;
};

const KEY = (setId: string) => `exam-vocab-guest:${setId}`;

export function emptyExamGuestProgress(): ExamGuestProgress {
  return {
    stage1Done: false,
    stage1Seen: [],
    stage2Done: false,
    stage4Best: 0,
    stage4Passed: false,
    stage4Last: 0,
    stage4Attempts: 0,
  };
}

export function loadExamGuestProgress(setId: string): ExamGuestProgress {
  if (typeof window === "undefined") return emptyExamGuestProgress();
  try {
    const raw = localStorage.getItem(KEY(setId));
    if (!raw) return emptyExamGuestProgress();
    return { ...emptyExamGuestProgress(), ...JSON.parse(raw) };
  } catch {
    return emptyExamGuestProgress();
  }
}

export function saveExamGuestProgress(
  setId: string,
  progress: ExamGuestProgress
) {
  try {
    localStorage.setItem(KEY(setId), JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}
