export interface StudentRecordPdfDocument {
  name: string;
  dataUrl: string;
}

export interface StudentRecordAnalysisResult {
  studentId: string | null;
  studentName: string;
  html: string;
  generatedAt: string;
  /** 분석 기록 ID — 보고서 내용 수정 저장에 사용 */
  recordId?: string | null;
}

export interface AnalyzeStudentRecordInput {
  studentId: string | null;
  studentName: string;
  text: string;
  imageDataUrls: string[];
  pdfDocuments: StudentRecordPdfDocument[];
}
