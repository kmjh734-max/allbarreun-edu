export type ExamQuestionKind =
  | "word_mc"
  | "word_sa"
  | "meaning_mc"
  | "meaning_sa"
  | "example_mc"
  | "example_sa";

export type ExamColumnCount = 1 | 2 | 3 | 4;
export type ExamLineSpacing = "compact" | "normal" | "wide";

export interface ExamPrintConfig {
  word_mc: number;
  word_sa: number;
  meaning_mc: number;
  meaning_sa: number;
  example_mc: number;
  example_sa: number;
}

export interface ExamPrintLayout {
  columns: ExamColumnCount;
  lineSpacing: ExamLineSpacing;
  shuffle: boolean;
}

export interface ExamPrintSettings {
  counts: ExamPrintConfig;
  layout: ExamPrintLayout;
  /** 변경 시 문항 순서 재생성 */
  shuffleSeed: number;
}

export const DEFAULT_EXAM_PRINT_CONFIG: ExamPrintConfig = {
  word_mc: 0,
  word_sa: 0,
  meaning_mc: 0,
  meaning_sa: 0,
  example_mc: 0,
  example_sa: 0,
};

export const DEFAULT_EXAM_LAYOUT: ExamPrintLayout = {
  columns: 1,
  lineSpacing: "normal",
  shuffle: true,
};

export const DEFAULT_EXAM_SETTINGS: ExamPrintSettings = {
  counts: DEFAULT_EXAM_PRINT_CONFIG,
  layout: DEFAULT_EXAM_LAYOUT,
  shuffleSeed: 0,
};

export const EXAM_COLUMN_LABELS: Record<ExamColumnCount, string> = {
  1: "1단",
  2: "2단",
  3: "3단",
  4: "4단",
};

export const EXAM_LINE_SPACING_LABELS: Record<ExamLineSpacing, string> = {
  compact: "좁게",
  normal: "보통",
  wide: "넓게",
};

/** 문항 사이 간격 (px) */
export const EXAM_ROW_GAP_PX: Record<ExamLineSpacing, number> = {
  compact: 0,
  normal: 4,
  wide: 10,
};

export function examConfigTotal(config: ExamPrintConfig): number {
  return (
    config.word_mc +
    config.word_sa +
    config.meaning_mc +
    config.meaning_sa +
    config.example_mc +
    config.example_sa
  );
}

function readCount(
  searchParams: URLSearchParams,
  key: keyof ExamPrintConfig
): number {
  const raw = searchParams.get(key);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 0;
}

export function parseExamColumnCount(raw: string | null): ExamColumnCount {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (n === 2 || n === 3 || n === 4) return n;
  return 1;
}

export function parseExamLineSpacing(raw: string | null): ExamLineSpacing {
  if (raw === "compact" || raw === "wide") return raw;
  return "normal";
}

export function parseExamPrintSettings(
  searchParams: URLSearchParams
): ExamPrintSettings {
  const shuffleParam = searchParams.get("exam_shuffle");
  const shuffle =
    shuffleParam === null ? true : shuffleParam === "1" || shuffleParam === "true";

  const seedRaw = searchParams.get("exam_seed");
  const shuffleSeed = seedRaw ? Number.parseInt(seedRaw, 10) || 0 : 0;

  return {
    counts: {
      word_mc: readCount(searchParams, "word_mc"),
      word_sa: readCount(searchParams, "word_sa"),
      meaning_mc: readCount(searchParams, "meaning_mc"),
      meaning_sa: readCount(searchParams, "meaning_sa"),
      example_mc: readCount(searchParams, "example_mc"),
      example_sa: readCount(searchParams, "example_sa"),
    },
    layout: {
      columns: parseExamColumnCount(searchParams.get("exam_cols")),
      lineSpacing: parseExamLineSpacing(searchParams.get("exam_spacing")),
      shuffle,
    },
    shuffleSeed,
  };
}

export function examSettingsToSearchParams(
  settings: ExamPrintSettings
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings.counts)) {
    if (v > 0) out[k] = String(v);
  }
  if (settings.layout.columns !== 1) {
    out.exam_cols = String(settings.layout.columns);
  }
  if (settings.layout.lineSpacing !== "normal") {
    out.exam_spacing = settings.layout.lineSpacing;
  }
  if (!settings.layout.shuffle) {
    out.exam_shuffle = "0";
  }
  if (settings.shuffleSeed > 0) {
    out.exam_seed = String(settings.shuffleSeed);
  }
  return out;
}

/** 단당 기본 행 수 (B5 5행, A4 6행) */
export function examRowsPerColumn(size: "a4" | "b5"): number {
  return size === "b5" ? 5 : 6;
}

export function examQuestionsPerPage(
  size: "a4" | "b5",
  columns: ExamColumnCount
): number {
  return examRowsPerColumn(size) * columns;
}
