import { isGpt5FamilyModel } from "@/lib/student-records/model";

/** PDF 직접 OCR 1회 출력 상한 */
export const PDF_OCR_MAX_OUTPUT_TOKENS = 16_384;

/** Vision 배치 OCR 1회 출력 상한 */
export const VISION_OCR_MAX_OUTPUT_TOKENS = 16_384;

export const OCR_MODEL_PRIMARY = "gpt-5";
export const OCR_MODEL_FALLBACK = "gpt-4o";

/** OCR 모델 (미설정 시 gpt-5 → 실패 시 gpt-4o) */
export function getOcrModelCandidates(): string[] {
  const configured = process.env.OPENAI_MODEL_STUDENT_RECORDS_OCR?.trim();
  if (configured) {
    if (configured === OCR_MODEL_PRIMARY) {
      return [OCR_MODEL_PRIMARY, OCR_MODEL_FALLBACK];
    }
    return [configured, OCR_MODEL_FALLBACK];
  }
  return [OCR_MODEL_PRIMARY, OCR_MODEL_FALLBACK];
}

export function buildOcrChatBody(
  model: string,
  system: string,
  content: unknown,
  options?: {
    includeTemperature?: boolean;
    includeReasoningEffort?: boolean;
    maxOutputTokens?: number;
  }
): Record<string, unknown> {
  const includeTemperature = options?.includeTemperature ?? !isGpt5FamilyModel(model);
  const includeReasoningEffort =
    options?.includeReasoningEffort ?? isGpt5FamilyModel(model);
  const maxOut =
    options?.maxOutputTokens ??
    (isGpt5FamilyModel(model) ? PDF_OCR_MAX_OUTPUT_TOKENS : PDF_OCR_MAX_OUTPUT_TOKENS);

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
  };

  if (includeTemperature) {
    body.temperature = 0.2;
  }

  if (isGpt5FamilyModel(model)) {
    body.max_completion_tokens = maxOut;
    if (includeReasoningEffort) {
      body.reasoning_effort = "low";
    }
  } else {
    body.max_tokens = maxOut;
  }

  return body;
}

export function sanitizePdfFilename(name: string): string {
  const base = name.trim() || "student-record.pdf";
  if (base.toLowerCase().endsWith(".pdf")) return base;
  return `${base}.pdf`;
}

export function pdfDataUrlToBuffer(dataUrl: string): Buffer {
  const marker = "base64,";
  const idx = dataUrl.indexOf(marker);
  const b64 = idx >= 0 ? dataUrl.slice(idx + marker.length) : dataUrl;
  return Buffer.from(b64, "base64");
}
