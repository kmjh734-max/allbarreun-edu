import { STUDENT_RECORD_MAX_PDF_PAGES } from "@/lib/student-records/limits";
import { createPdfParser } from "@/lib/student-records/pdf-runtime";

const NATIVE_GRADE_SIGNAL =
  /석차등급|성취도|원점수|과목명|교과학습발달|학기별|이수학점/g;

/** PDF에 선택 가능한 텍스트가 충분히 있는지 (스캔 PDF는 false) */
export function isReliableNativePdfText(text: string): boolean {
  const trimmed = text.trim();
  const compact = trimmed.replace(/\s+/g, "");
  if (compact.length < 200) return false;

  const signals = trimmed.match(NATIVE_GRADE_SIGNAL)?.length ?? 0;
  const rankMarks = trimmed.match(/\b[1-9]\s*등급\b/g)?.length ?? 0;
  return signals >= 2 || rankMarks >= 5;
}

/** pdf-parse로 PDF 내장 텍스트 추출 (결정적·스캔 PDF에는 빈약) */
export async function extractNativePdfText(buffer: Buffer): Promise<string | null> {
  const parser = createPdfParser(buffer);

  try {
    const result = await parser.getText({
      first: STUDENT_RECORD_MAX_PDF_PAGES,
      pageJoiner: "\n=== PDF 텍스트 페이지 page_number ===\n",
      lineEnforce: true,
      cellSeparator: "\t",
    });

    const text = result.text?.trim() ?? "";
    if (!isReliableNativePdfText(text)) return null;

    return `=== PDF 내장 텍스트 (원문) ===\n${text}`;
  } catch {
    return null;
  } finally {
    await parser.destroy();
  }
}
