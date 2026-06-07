export function buildStudentRecordPdfFileName(studentName: string): string {
  const safeName = studentName.replace(/[\\/:*?"<>|]/g, "_").trim() || "학생";
  const date = new Date().toISOString().slice(0, 10);
  return `${safeName}_학생부분석_${date}.pdf`;
}
