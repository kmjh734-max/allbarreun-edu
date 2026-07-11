export interface GenerateExampleInput {
  word: string;
  meaning: string;
}

export interface GenerateExampleResult {
  word: string;
  meaning: string;
  example_sentence: string;
  example_meaning: string;
}

export type ExampleLevel = "middle" | "high";

export async function fetchGeneratedExamples(
  items: GenerateExampleInput[],
  level: ExampleLevel = "middle"
): Promise<
  | { ok: true; items: GenerateExampleResult[] }
  | { ok: false; message: string }
> {
  try {
    const res = await fetch("/api/vocab/generate-examples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, level }),
      credentials: "same-origin",
    });

    let data: {
      ok: boolean;
      message?: string;
      items?: GenerateExampleResult[];
    };

    try {
      data = (await res.json()) as typeof data;
    } catch {
      return {
        ok: false,
        message: `서버 응답 오류 (HTTP ${res.status}). 로그인 상태를 확인해 주세요.`,
      };
    }

    if (!data.ok || !data.items) {
      return {
        ok: false,
        message: data.message ?? "AI 예문 생성에 실패했습니다.",
      };
    }

    return { ok: true, items: data.items };
  } catch {
    return { ok: false, message: "AI 예문 생성에 실패했습니다." };
  }
}
