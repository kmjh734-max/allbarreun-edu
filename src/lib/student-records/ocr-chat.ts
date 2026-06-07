import { isGpt5FamilyModel } from "@/lib/student-records/model";

/** OCR 재현성 — 동일 입력 시 전사 변동 최소화 */
export const OCR_TEMPERATURE = 0;
export const OCR_DETERMINISTIC_SEED = 42;

/** PDF 직접 OCR 1회 출력 상한 */
export const PDF_OCR_MAX_OUTPUT_TOKENS = 16_384;

/** Vision 배치 OCR 1회 출력 상한 */
export const VISION_OCR_MAX_OUTPUT_TOKENS = 16_384;

/** Vision OCR — gpt-4o가 한글 스캔·표 전사에 더 안정적 */
export const OCR_MODEL_PRIMARY = "gpt-4o";
export const OCR_MODEL_SECONDARY = "gpt-4.1";
export const OCR_MODEL_FALLBACK = "gpt-4o-mini";

const DEFAULT_OCR_MODELS = [
  OCR_MODEL_PRIMARY,
  OCR_MODEL_SECONDARY,
  OCR_MODEL_FALLBACK,
];

function uniqueModels(models: string[]): string[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    const key = model.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** OCR 모델 — env: `gpt-4o` 또는 `gpt-4o,gpt-4.1` (미설정 시 4o → 4.1 → 4o-mini) */
export function getOcrModelCandidates(): string[] {
  const configured = process.env.OPENAI_MODEL_STUDENT_RECORDS_OCR?.trim();
  if (configured) {
    const fromEnv = configured.split(",").map((m) => m.trim()).filter(Boolean);
    return uniqueModels([...fromEnv, OCR_MODEL_FALLBACK]);
  }
  return DEFAULT_OCR_MODELS;
}

export type OcrChatMode = "vision" | "structured";

export function buildOcrChatBody(
  model: string,
  system: string,
  content: unknown,
  options?: {
    /** vision=이미지 전사(4o·온도0.1), structured=성적 JSON(온도0·seed) */
    mode?: OcrChatMode;
    includeTemperature?: boolean;
    includeSeed?: boolean;
    /** OCR 전사는 reasoning 비활성 — 출력 토큰을 전사에만 사용 */
    includeReasoningEffort?: boolean;
    maxOutputTokens?: number;
  }
): Record<string, unknown> {
  const mode = options?.mode ?? "structured";
  const includeTemperature =
    options?.includeTemperature ?? !isGpt5FamilyModel(model);
  const includeSeed =
    options?.includeSeed ?? (mode === "structured");
  const includeReasoningEffort = options?.includeReasoningEffort ?? false;
  const maxOut = options?.maxOutputTokens ?? PDF_OCR_MAX_OUTPUT_TOKENS;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
  };

  if (includeTemperature) {
    body.temperature = mode === "vision" ? 0.1 : OCR_TEMPERATURE;
    body.top_p = 1;
  }

  if (includeSeed && mode === "structured") {
    body.seed = OCR_DETERMINISTIC_SEED;
  }

  if (isGpt5FamilyModel(model)) {
    body.max_completion_tokens = maxOut;
    if (includeReasoningEffort) {
      body.reasoning_effort = "minimal";
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
