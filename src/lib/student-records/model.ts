export const STUDENT_RECORD_MODEL_PRIMARY = "gpt-5.5";
export const STUDENT_RECORD_MODEL_FALLBACK = "gpt-5";

export const STUDENT_RECORD_MAX_COMPLETION_TOKENS = 16_384;

export function getStudentRecordModelCandidates(): string[] {
  const configured = process.env.OPENAI_MODEL_STUDENT_RECORDS?.trim();
  if (configured) {
    if (configured === STUDENT_RECORD_MODEL_PRIMARY) {
      return [STUDENT_RECORD_MODEL_PRIMARY, STUDENT_RECORD_MODEL_FALLBACK];
    }
    return [configured];
  }
  return [STUDENT_RECORD_MODEL_PRIMARY, STUDENT_RECORD_MODEL_FALLBACK];
}

export function isGpt5FamilyModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith("gpt-5");
}

export function studentRecordModelSupportsTemperature(model: string): boolean {
  const m = model.trim().toLowerCase();
  if (m.startsWith("gpt-5")) return false;
  if (/^o\d/.test(m)) return false;
  return true;
}

export function isModelUnavailableError(status: number, bodyText: string): boolean {
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

export function buildStudentRecordChatBody(
  model: string,
  system: string,
  content: unknown,
  options?: { includeTemperature?: boolean; includeReasoningEffort?: boolean }
): Record<string, unknown> {
  const includeTemperature =
    options?.includeTemperature ?? studentRecordModelSupportsTemperature(model);
  const includeReasoningEffort =
    options?.includeReasoningEffort ?? isGpt5FamilyModel(model);

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
  };

  if (includeTemperature) {
    body.temperature = 0.35;
  }

  if (isGpt5FamilyModel(model)) {
    body.max_completion_tokens = STUDENT_RECORD_MAX_COMPLETION_TOKENS;
    if (includeReasoningEffort) {
      body.reasoning_effort = "low";
    }
  } else {
    body.max_tokens = STUDENT_RECORD_MAX_COMPLETION_TOKENS;
  }

  return body;
}
