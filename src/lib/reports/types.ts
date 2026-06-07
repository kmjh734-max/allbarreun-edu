export type ReportRange = "all" | "7d" | "30d" | "month";

export interface ReportStudentOption {
  id: string;
  name: string;
  loginId: string | null;
  classNames: string[];
}

export interface ReportClassOption {
  id: string;
  name: string;
}

export interface CourseReportSection {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  lastStudiedAt: string | null;
  /** 완료한 영상 제목만 (미완료는 리포트에 표시하지 않음) */
  completedLessonsList: string[];
}

export interface VocabReportSection {
  setId: string;
  setTitle: string;
  itemCount: number;
  stage1Completed: boolean;
  stage2Completed: boolean;
  stage3Completed: boolean;
  stage4Passed: boolean;
  stage4LastScore: number;
  stage4BestScore: number;
  stage4AttemptCount: number;
  lastStudiedAt: string | null;
  statusLabel: string;
}

export interface ReviewWordRow {
  itemId: string;
  word: string;
  meaning: string;
  stages: string[];
  wrongCount: number;
  recentWrong: boolean;
}

export interface ListeningDictationReportRow {
  setId: string;
  setTitle: string;
  questionCount: number;
  passedQuestionCount: number;
  averageBestScore: number | null;
  totalAttempts: number;
  frequentWrongWords: string[];
  summaryLine: string;
}

export interface StudentReport {
  generatedAt: string;
  range: ReportRange;
  rangeLabel: string;
  student: {
    id: string;
    name: string;
    loginId: string | null;
    classNames: string[];
  };
  summary: {
    videoLine: string;
    vocabLine: string;
    reviewLine: string;
    listeningDictationLine: string;
  };
  courses: CourseReportSection[];
  vocabSets: VocabReportSection[];
  listeningDictation: ListeningDictationReportRow[];
  reviewWords: ReviewWordRow[];
}
