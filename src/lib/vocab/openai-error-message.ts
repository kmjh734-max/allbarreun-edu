export function openAiErrorMessage(status: number, bodyText: string): string {
  try {
    const body = JSON.parse(bodyText) as {
      error?: { message?: string; code?: string; type?: string };
    };
    const code = body.error?.code ?? body.error?.type;
    const msg = body.error?.message ?? "";

    if (code === "insufficient_quota" || msg.includes("quota")) {
      return "OpenAI 사용 한도가 없습니다. platform.openai.com → Settings → Billing에서 결제 수단·크레딧을 확인해 주세요.";
    }
    if (status === 401 || code === "invalid_api_key") {
      return "OPENAI_API_KEY가 올바르지 않습니다. 키를 다시 발급해 .env.local과 Vercel에 등록해 주세요.";
    }
    if (status === 429) {
      return "OpenAI 요청 한도에 걸렸습니다. 잠시 후 다시 시도하거나 Billing을 확인해 주세요.";
    }
    if (msg) return `OpenAI 오류: ${msg}`;
  } catch {
    /* ignore parse errors */
  }
  return `AI 요청에 실패했습니다. (OpenAI HTTP ${status})`;
}
