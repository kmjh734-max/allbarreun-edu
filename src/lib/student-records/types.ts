export interface StudentRecordPdfDocument {
  name: string;
  dataUrl: string;
}

export interface StudentRecordAnalysisResult {
  studentId: string | null;
  studentName: string;
  html: string;
  generatedAt: string;
}

export interface AnalyzeStudentRecordInput {
  studentId: string | null;
  studentName: string;
  text: string;
  imageDataUrls: string[];
  pdfDocuments: StudentRecordPdfDocument[];
}
