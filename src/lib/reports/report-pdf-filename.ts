/** PDF 저장 시 안내용 파일명: {학생명}_학습리포트_{기간라벨}.pdf */
export function buildReportPdfFileName(
  studentName: string,
  rangeLabel: string
): string {
  const safeName = sanitizeFilePart(studentName) || "학생";
  const safeRange = sanitizeFilePart(rangeLabel) || "기간";
  return `${safeName}_학습리포트_${safeRange}.pdf`;
}

function sanitizeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "");
}
