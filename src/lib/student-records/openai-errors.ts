export function summarizeOpenAiError(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();

  if (status === 401) {
    return "OpenAI API 키가 올바르지 않습니다. Vercel 환경 변수 OPENAI_API_KEY를 확인해 주세요.";
  }
  if (status === 403) {
    return "OpenAI API 접근이 거부되었습니다. API 키 권한·결제 상태를 확인해 주세요.";
  }
  if (status === 429) {
    return "OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status === 400 && lower.includes("image_url")) {
    return "이미지 형식을 OpenAI가 처리하지 못했습니다.";
  }
  if (status === 400 && lower.includes("maximum context length")) {
    return "이미지·텍스트 용량이 모델 한도를 초과했습니다.";
  }
  if (status >= 500) {
    return "OpenAI 서버가 일시적으로 응답하지 않습니다.";
  }

  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string; code?: string };
    };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg.slice(0, 180);
  } catch {
    // ignore
  }

  return `OpenAI API 오류 (HTTP ${status})`;
}
