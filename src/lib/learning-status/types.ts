export type HomeworkDaySymbol = "complete" | "partial" | "missing" | "scheduled" | "none";

export interface HomeworkDayCell {
  day: number;
  weekday: number;
  taskDate: string;
  symbol: HomeworkDaySymbol;
  isToday: boolean;
  isStudyDay: boolean;
  completedCount: number;
  totalCount: number;
}

export interface ListeningOmrAttemptRow {
  studentId: string;
  studentName: string;
  classLabel: string;
  setId: string;
  setTitle: string;
  examDate: string;
  score: number;
  correctCount: number;
  totalCount: number;
}

export interface ListeningOmrStudentSummary {
  studentId: string;
  studentName: string;
  classLabel: string;
  attemptCount: number;
  bestScore: number | null;
  latestScore: number | null;
  latestDate: string | null;
  attempts: ListeningOmrAttemptRow[];
}

export interface ListeningStatusRow {
  studentId: string;
  studentName: string;
  classLabel: string;
  programLabel: string;
  days: HomeworkDayCell[];
  completedCount: number;
  totalCount: number;
  executionRate: number;
}

export interface ListeningStatusTable {
  year: number;
  month: number;
  todayIso: string;
  daysInMonth: number;
  rows: ListeningStatusRow[];
  omrByStudent: ListeningOmrStudentSummary[];
}

export interface VocabTodayStatusRow {
  studentId: string;
  studentName: string;
  classLabel: string;
  setId: string;
  setTitle: string;
  activityLabel: string;
  studiedToday: boolean;
}

export interface VocabTodayStatusTable {
  dateIso: string;
  rows: VocabTodayStatusRow[];
}
