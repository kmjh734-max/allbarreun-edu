import { pdfFileToJpegFiles } from "@/lib/student-records/client-pdf-render";
import { isImageUpload, isPdfUpload } from "@/lib/student-records/file-types";
import {
  STUDENT_RECORD_EXTRACT_CHUNK_PAGES,
  STUDENT_RECORD_MAX_DIRECT_IMAGES,
  STUDENT_RECORD_MAX_IMAGE_BYTES,
  STUDENT_RECORD_MAX_PDF_BYTES,
  STUDENT_RECORD_MAX_PDF_PAGES,
  STUDENT_RECORD_MAX_TOTAL_BYTES,
  STUDENT_RECORD_PREPARED_UPLOAD_BUDGET,
} from "@/lib/student-records/limits";

export {
  STUDENT_RECORD_EXTRACT_CHUNK_PAGES,
  STUDENT_RECORD_MAX_PDF_PAGES,
  STUDENT_RECORD_MAX_TOTAL_BYTES,
} from "@/lib/student-records/limits";

/**
 * 요청당 장수·용량 예산에 맞춰 파일을 묶음으로 분할.
 * 전체 합계가 아닌 묶음(요청) 단위로만 서버 한도를 지키면 되므로
 * 전체 업로드 용량에는 제한이 없다.
 */
export function chunkStudentRecordFiles(
  files: File[],
  chunkSize = STUDENT_RECORD_EXTRACT_CHUNK_PAGES,
  maxChunkBytes = STUDENT_RECORD_PREPARED_UPLOAD_BUDGET
): File[][] {
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const overflow =
      current.length >= chunkSize ||
      (current.length > 0 && currentBytes + file.size > maxChunkBytes);
    if (overflow) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function validateStudentRecordFiles(files: File[]): string | null {
  let imageCount = 0;

  for (const file of files) {
    if (isPdfUpload(file)) {
      if (file.size > STUDENT_RECORD_MAX_PDF_BYTES) {
        return `PDF는 ${formatBytes(STUDENT_RECORD_MAX_PDF_BYTES)} 이하만 업로드할 수 있습니다. (${file.name})`;
      }
      continue;
    }

    if (isImageUpload(file)) {
      imageCount += 1;
      if (imageCount > STUDENT_RECORD_MAX_DIRECT_IMAGES) {
        return `이미지는 최대 ${STUDENT_RECORD_MAX_DIRECT_IMAGES}장까지 업로드할 수 있습니다.`;
      }
      if (file.size > STUDENT_RECORD_MAX_IMAGE_BYTES) {
        return `이미지는 ${formatBytes(STUDENT_RECORD_MAX_IMAGE_BYTES)} 이하만 업로드할 수 있습니다. (${file.name})`;
      }
      continue;
    }

    return "지원 형식: PDF, JPG/PNG/WEBP 이미지입니다.";
  }

  return null;
}

/** PDF→JPEG 변환 후 전체 페이지 수 검증 */
export function validatePreparedStudentRecordFiles(files: File[]): string | null {
  let imageCount = 0;

  for (const file of files) {
    if (isPdfUpload(file)) {
      return "PDF 변환에 실패했습니다. 브라우저를 새로고침한 뒤 다시 시도해 주세요.";
    }

    if (isImageUpload(file)) {
      imageCount += 1;
      if (imageCount > STUDENT_RECORD_MAX_PDF_PAGES) {
        return `처리 가능한 페이지는 최대 ${STUDENT_RECORD_MAX_PDF_PAGES}장입니다.`;
      }
      continue;
    }

    return "지원 형식: PDF, JPG/PNG/WEBP 이미지입니다.";
  }

  return null;
}

/** OCR extract 1회 요청 분량 검증 */
export function validatePreparedExtractChunk(files: File[]): string | null {
  if (files.length === 0) {
    return "OCR할 이미지가 없습니다.";
  }
  if (files.length > STUDENT_RECORD_EXTRACT_CHUNK_PAGES) {
    return `한 번에 OCR할 수 있는 페이지는 ${STUDENT_RECORD_EXTRACT_CHUNK_PAGES}장입니다.`;
  }

  let total = 0;
  for (const file of files) {
    total += file.size;
    if (isPdfUpload(file)) {
      return "PDF 변환에 실패했습니다. 브라우저를 새로고침한 뒤 다시 시도해 주세요.";
    }
    if (!isImageUpload(file)) {
      return "지원 형식: JPG/PNG/WEBP 이미지입니다.";
    }
  }

  if (total > STUDENT_RECORD_MAX_TOTAL_BYTES) {
    return `이미지 묶음 용량이 ${formatBytes(STUDENT_RECORD_MAX_TOTAL_BYTES)}를 초과합니다. PDF 페이지 수를 줄여 주세요.`;
  }

  return null;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImageForUpload(file: File): Promise<File> {
  if (!isImageUpload(file)) return file;
  if (file.size <= 300_000) return file;

  const img = await loadImage(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.78);
  });
  if (!blob || blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export async function prepareStudentRecordFiles(
  files: File[],
  onProgress?: (label: string) => void
): Promise<File[]> {
  const prepared: File[] = [];

  for (const file of files) {
    if (isPdfUpload(file)) {
      onProgress?.("PDF 페이지 변환 중…");
      const pages = await pdfFileToJpegFiles(file, {
        onProgress: (current, total) =>
          onProgress?.(`PDF 변환 ${current}/${total}…`),
      });
      if (pages.length === 0) {
        throw new Error(
          "PDF를 페이지 이미지로 변환하지 못했습니다. 스캔 품질을 확인하거나 이미지(JPG)로 저장해 업로드해 주세요."
        );
      }
      prepared.push(...pages);
      continue;
    }

    if (isImageUpload(file)) {
      prepared.push(await compressImageForUpload(file));
      continue;
    }

    prepared.push(file);
  }

  return prepared;
}

/**
 * 일시적 서버 오류(5xx)·네트워크 오류 시 자동 재시도.
 * 미들웨어/플랫폼 단계의 산발적 500이 사용자에게 그대로 노출되지 않게 한다.
 */
export async function fetchStudentRecordApi(
  input: RequestInfo,
  init: RequestInit,
  retries = 2
): Promise<Response> {
  let attempt = 0;
  for (;;) {
    try {
      const res = await fetch(input, init);
      if (res.status >= 500 && attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      throw e;
    }
  }
}

export async function readStudentRecordApiResponse<T extends { ok?: boolean; message?: string }>(
  res: Response
): Promise<{ data: T | null; error: string | null }> {
  const text = await res.text();

  if (!text.trim()) {
    if (res.status === 413) {
      return {
        data: null,
        error: `업로드 용량이 서버 한도를 초과했습니다. PDF·이미지 용량을 줄여 주세요. (최대 약 ${formatBytes(STUDENT_RECORD_MAX_TOTAL_BYTES)})`,
      };
    }
    return { data: null, error: `요청에 실패했습니다. (${res.status})` };
  }

  try {
    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch {
    const lower = text.toLowerCase();
    if (
      res.status === 413 ||
      lower.includes("request entity too large") ||
      lower.includes("payload too large")
    ) {
      return {
        data: null,
        error: `업로드 용량이 서버 한도를 초과했습니다. PDF·이미지 용량을 줄여 주세요. (최대 약 ${formatBytes(STUDENT_RECORD_MAX_TOTAL_BYTES)})`,
      };
    }
    if (
      res.status === 504 ||
      lower.includes("timeout") ||
      lower.includes("function_invocation") ||
      lower.includes("gateway")
    ) {
      return {
        data: null,
        error:
          "처리 시간이 서버 한도(약 1~5분)를 초과했습니다. PDF 페이지 수를 줄이거나 잠시 후 다시 시도해 주세요. (용량이 작아도 페이지·OCR 단계가 많으면 시간이 걸립니다.)",
      };
    }
    if (res.status === 502 || res.status === 503) {
      return {
        data: null,
        error: "서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    if (text.trimStart().startsWith("<")) {
      return {
        data: null,
        error: `서버 오류가 발생했습니다 (HTTP ${res.status}). 분석 시간 초과이거나 PDF 처리 오류일 수 있습니다.`,
      };
    }
    return {
      data: null,
      error: `서버 응답을 처리하지 못했습니다 (HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`,
    };
  }
}
