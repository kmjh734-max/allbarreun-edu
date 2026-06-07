import { STUDENT_RECORD_ANALYSIS_TIMEOUT_MS } from "@/lib/student-records/limits";
import {
  isReliableStudentRecordExtract,
  stripOcrPlaceholders,
} from "@/lib/student-records/ocr-quality";
import { extractTextFromPdfDocuments } from "@/lib/student-records/pdf-ocr";
import type { AnalyzeStudentRecordInput } from "@/lib/student-records/types";
import {
  countSuccessfulOcrPages,
  extractTextFromPageImages,
  getLastVisionApiError,
} from "@/lib/student-records/vision-extract";

export async function extractStudentRecordContent(
  input: AnalyzeStudentRecordInput
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, message: "OPENAI_API_KEY가 설정되어 있지 않습니다." };
  }

  if (
    !input.text.trim() &&
    input.imageDataUrls.length === 0 &&
    input.pdfDocuments.length === 0
  ) {
    return {
      ok: false,
      message: "학생부 텍스트 또는 이미지/PDF 자료를 입력해 주세요.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    STUDENT_RECORD_ANALYSIS_TIMEOUT_MS
  );

  try {
    const chunks: string[] = [];

    const pasted = input.text.trim();
    if (pasted) {
      chunks.push(pasted);
    }

    if (input.pdfDocuments.length > 0) {
      const ocrText = await extractTextFromPdfDocuments(
        apiKey,
        input.pdfDocuments,
        input.studentName,
        controller.signal
      );
      if (ocrText.trim()) {
        chunks.push(ocrText);
      }
    }

    if (input.imageDataUrls.length > 0) {
      const extracted = await extractTextFromPageImages(
        apiKey,
        input.imageDataUrls,
        input.studentName,
        controller.signal
      );
      if (extracted.trim()) {
        chunks.push(extracted);
      }
    }

    const combined = chunks.join("\n\n");
    const substantive = stripOcrPlaceholders(combined);

    if (!isReliableStudentRecordExtract(combined)) {
      const hadImages = input.imageDataUrls.length > 0;
      const hadPdf = input.pdfDocuments.length > 0;
      const ocrStats = hadImages ? countSuccessfulOcrPages(combined) : null;
      const pageHint = ocrStats
        ? ` (${ocrStats.success}/${ocrStats.total}페이지 인식)`
        : "";
      const apiHint = hadImages ? getLastVisionApiError() : null;

      return {
        ok: false,
        message: hadImages
          ? `학생부 이미지 OCR에 실패했습니다${pageHint}.${apiHint ? ` ${apiHint}` : ""} 스캔 선명도를 확인하거나, 텍스트를 직접 붙여넣어 주세요.`
          : hadPdf
            ? "PDF OCR에 실패했습니다. PDF 용량(4MB 이하)과 선명도를 확인한 뒤 다시 시도해 주세요."
            : "PDF/이미지에서 내용을 읽지 못했습니다. 파일이 선명한지 확인해 주세요.",
      };
    }

    return { ok: true, text: substantive };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      message: timedOut
        ? "OCR 처리 시간이 초과했습니다. 페이지 수를 줄이거나 잠시 후 다시 시도해 주세요."
        : "자료 읽기 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  } finally {
    clearTimeout(timer);
  }
}
