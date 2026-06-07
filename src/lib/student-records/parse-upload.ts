import {
  isImageUpload,
  isPdfUpload,
  resolveImageMimeType,
} from "@/lib/student-records/file-types";
import {
  STUDENT_RECORD_MAX_PDF_BYTES,
  STUDENT_RECORD_MAX_PDF_PAGES,
  STUDENT_RECORD_MAX_TOTAL_BYTES,
} from "@/lib/student-records/limits";
import type { StudentRecordPdfDocument } from "@/lib/student-records/types";

export { isPdfUpload } from "@/lib/student-records/file-types";

export interface ParsedStudentRecordUpload {
  textParts: string[];
  imageDataUrls: string[];
  pdfDocuments: StudentRecordPdfDocument[];
}

export async function parseStudentRecordUpload(
  formData: FormData
): Promise<ParsedStudentRecordUpload> {
  const textParts: string[] = [];
  const pasted = formData.get("text");
  if (typeof pasted === "string" && pasted.trim()) {
    textParts.push(pasted.trim());
  }

  const imageDataUrls: string[] = [];
  const pdfDocuments: StudentRecordPdfDocument[] = [];
  const files = formData.getAll("files");
  let totalBytes = 0;

  if (files.length === 0) {
    return { textParts, imageDataUrls, pdfDocuments };
  }

  for (const entry of files) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    totalBytes += entry.size;
    if (totalBytes > STUDENT_RECORD_MAX_TOTAL_BYTES) {
      throw new Error(
        "전체 업로드 용량이 서버 한도(약 4MB)를 초과합니다. 파일 수·용량을 줄여 주세요."
      );
    }

    if (isPdfUpload(entry)) {
      if (entry.size > STUDENT_RECORD_MAX_PDF_BYTES) {
        throw new Error("PDF 파일은 4MB 이하만 업로드할 수 있습니다.");
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      pdfDocuments.push({
        name: entry.name,
        dataUrl: `data:application/pdf;base64,${buffer.toString("base64")}`,
      });
      textParts.push(
        `[PDF: ${entry.name}] 스캔 PDF — OpenAI OCR로 전 페이지 분석합니다.`
      );
      continue;
    }

    if (isImageUpload(entry)) {
      if (imageDataUrls.length >= STUDENT_RECORD_MAX_PDF_PAGES) {
        throw new Error(
          `처리 가능한 이미지는 최대 ${STUDENT_RECORD_MAX_PDF_PAGES}장입니다.`
        );
      }
      if (entry.size > 1 * 1024 * 1024) {
        throw new Error("이미지 파일은 1MB 이하만 업로드할 수 있습니다.");
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      const mime = resolveImageMimeType(entry);
      imageDataUrls.push(`data:${mime};base64,${buffer.toString("base64")}`);
      continue;
    }

    throw new Error(
      `지원하지 않는 파일 형식입니다. (${entry.name || "unknown"}) PDF, JPG/PNG/WEBP만 업로드할 수 있습니다.`
    );
  }

  return { textParts, imageDataUrls, pdfDocuments };
}
