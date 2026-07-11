/** 듣기 문항 생성·검수·수정 기본 모델 (환경변수 미설정 시) */
export const LISTENING_MODEL_PRIMARY = "gpt-5.5";
export const LISTENING_MODEL_FALLBACK = "gpt-5";

/** GPT-5 추론+출력 토큰 상한 (응답이 비는 것 방지) */
export const LISTENING_GPT5_MAX_COMPLETION_TOKENS = 16_384;

/** 문항 수에 따른 completion 상한 (과도한 추롰 지연 방지) */
export function listeningMaxCompletionTokensForCount(questionCount: number): number {
  const n = Math.max(1, Math.min(questionCount, 20));
  return Math.min(LISTENING_GPT5_MAX_COMPLETION_TOKENS, 1200 + n * 2400);
}

export function isGpt5FamilyModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith("gpt-5");
}

/** 시도 순서: 환경변수 → 기본 gpt-5.5 → 실패 시 gpt-5 */
export function getListeningGeneratorModelCandidates(): string[] {
  const configured = process.env.OPENAI_MODEL_LISTENING_GENERATOR?.trim();
  if (configured) {
    if (configured === LISTENING_MODEL_PRIMARY) {
      return [LISTENING_MODEL_PRIMARY, LISTENING_MODEL_FALLBACK];
    }
    return [configured];
  }
  return [LISTENING_MODEL_PRIMARY, LISTENING_MODEL_FALLBACK];
}

export function getListeningGeneratorModel(): string {
  return getListeningGeneratorModelCandidates()[0]!;
}

/** GPT-5·o 시리즈 등은 temperature 커스텀 불가(기본값 1만 허용) */
export function listeningModelSupportsCustomTemperature(model: string): boolean {
  const m = model.trim().toLowerCase();
  if (m.startsWith("gpt-5")) return false;
  if (/^o\d/.test(m)) return false;
  return true;
}

export function isUnsupportedTemperatureError(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();
  return (
    lower.includes("temperature") &&
    (lower.includes("unsupported") ||
      lower.includes("does not support") ||
      lower.includes("only the default"))
  );
}

export function isUnsupportedParameterError(bodyText: string, param: string): boolean {
  const lower = bodyText.toLowerCase();
  const p = param.toLowerCase();
  return (
    lower.includes(p) &&
    (lower.includes("unsupported") ||
      lower.includes("does not support") ||
      lower.includes("not supported") ||
      lower.includes("unknown parameter"))
  );
}

export function isListeningModelUnavailableError(
  status: number,
  bodyText: string
): boolean {
  if (status === 404) return true;
  const lower = bodyText.toLowerCase();
  if (status !== 400 && status !== 403) return false;
  return (
    lower.includes("model") &&
    (lower.includes("does not exist") ||
      lower.includes("not found") ||
      lower.includes("invalid") ||
      lower.includes("unknown") ||
      lower.includes("not available") ||
      lower.includes("no longer"))
  );
}
