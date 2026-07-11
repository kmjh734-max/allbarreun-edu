import type { PrintExamQuestion } from "@/lib/vocab/generate-print-test-questions";
import {
  EXAM_ROW_GAP_PX,
  type ExamColumnCount,
  type ExamLineSpacing,
} from "@/lib/vocab/vocab-print-exam-config";

export interface ExamPrintPageSlice {
  basic: PrintExamQuestion[];
  examples: PrintExamQuestion[];
}

const BASIC_EXAMPLE_GAP_PX = 8;

function isExampleQuestion(q: PrintExamQuestion): boolean {
  return q.kind.startsWith("example_");
}

function paginateExamFlow(
  basic: PrintExamQuestion[],
  examples: PrintExamQuestion[],
  basicHeights: number[],
  exampleHeights: number[],
  maxH: number,
  cols: ExamColumnCount,
  rowGapPx: number
): ExamPrintPageSlice[] {
  const pages: ExamPrintPageSlice[] = [];
  let page: ExamPrintPageSlice = { basic: [], examples: [] };
  let usedH = 0;

  const hasContent = () => page.basic.length > 0 || page.examples.length > 0;

  const flush = () => {
    if (!hasContent()) return;
    pages.push(page);
    page = { basic: [], examples: [] };
    usedH = 0;
  };

  const leadingGapForBasicRow = () => (hasContent() ? rowGapPx : 0);

  const leadingGapForExample = () => {
    if (!hasContent()) return 0;
    if (page.basic.length > 0 && page.examples.length === 0) {
      return BASIC_EXAMPLE_GAP_PX;
    }
    return rowGapPx;
  };

  const place = (leadingGap: number, contentH: number, add: () => void) => {
    if (hasContent() && usedH + leadingGap + contentH > maxH) flush();
    const gap = hasContent() ? leadingGap : 0;
    add();
    usedH += gap + contentH;
  };

  for (let i = 0; i < basic.length; i += cols) {
    const row = basic.slice(i, i + cols);
    const rowHeights = row.map((_, j) => basicHeights[i + j] ?? 0);
    const contentH = Math.max(...rowHeights, 0);
    place(leadingGapForBasicRow(), contentH, () => {
      page.basic.push(...row);
    });
  }

  for (let i = 0; i < examples.length; i++) {
    const q = examples[i]!;
    const contentH = exampleHeights[i] ?? 0;
    place(leadingGapForExample(), contentH, () => {
      page.examples.push(q);
    });
  }

  flush();
  return pages;
}

export function paginateExamPrintFromHeights(
  basic: PrintExamQuestion[],
  examples: PrintExamQuestion[],
  basicHeights: number[],
  exampleHeights: number[],
  maxBodyHeightPx: number,
  columns: ExamColumnCount,
  rowGapPx: number
): ExamPrintPageSlice[] {
  const pages = paginateExamFlow(
    basic,
    examples,
    basicHeights,
    exampleHeights,
    maxBodyHeightPx,
    columns,
    rowGapPx
  );

  if (pages.length === 0) {
    pages.push({ basic: [], examples: [] });
  }

  return pages;
}

/** 추정치 기반 (측정 전 즉시 미리보기) */
export function paginateExamPrintPages(
  questions: PrintExamQuestion[],
  _size: "a4" | "b5",
  columns: ExamColumnCount,
  lineSpacing: ExamLineSpacing = "normal"
): ExamPrintPageSlice[] {
  const rowGapPx = EXAM_ROW_GAP_PX[lineSpacing];
  const fallbackBasic = 72;
  const fallbackExample = 96;
  const basic = questions.filter((q) => !isExampleQuestion(q));
  const examples = questions.filter(isExampleQuestion);

  return paginateExamPrintFromHeights(
    basic,
    examples,
    basic.map(() => fallbackBasic),
    examples.map(() => fallbackExample),
    99999,
    columns,
    rowGapPx
  );
}
