export interface MeaningGradeInput {
  word: string;
  correctMeaning: string;
  studentAnswer: string;
}

export interface MeaningGradeResult {
  isCorrect: boolean;
  feedback?: string;
}

const SYSTEM_PROMPT = `너는 영어 단어 뜻 시험의 채점자다.

채점 기준:
- 학생 답이 정답 뜻과 의미상 같거나 거의 같으면 정답
- 유의어, 비슷한 표현, 자연스러운 의역은 정답
- 조사, 어미, 표현 차이는 정답
- 명백한 한글 오타이지만 의미를 알 수 있으면 정답
- 뜻이 다르면 오답
- 너무 넓거나 모호해서 정답으로 보기 어려우면 오답
- 결과는 반드시 JSON으로만 반환`;

const MEANING_CHUNK_SIZE = 12;
const MEANING_AI_TIMEOUT_MS = 18_000;
const MEANING_CHUNK_CONCURRENCY = 2;

function openAiErrorMessage(status: number, bodyText: string): string {
  try {
    const body = JSON.parse(bodyText) as {
      error?: { message?: string; code?: string };
    };
    const msg = body.error?.message ?? "";
    if (body.error?.code === "insufficient_quota" || msg.includes("quota")) {
      return "OpenAI 사용 한도가 없습니다.";
    }
    if (msg) return msg;
  } catch {
    /* ignore */
  }
  return `AI 채점 오류 (HTTP ${status})`;
}

function buildBatchPrompt(items: MeaningGradeInput[]): string {
  const listText = items
    .map(
      (it, i) =>
        `${i + 1}. 영어 단어: ${it.word}\n   정답 뜻: ${it.correctMeaning}\n   학생 답: ${it.studentAnswer?.trim() || "(비어 있음)"}`
    )
    .join("\n\n");

  return `아래 ${items.length}개 항목을 채점하세요.

반환 형식 (JSON만):
{
  "results": [
    { "index": 1, "isCorrect": true, "feedback": "짧은 한국어 피드백" }
  ]
}

항목:
${listText}`;
}

function parseBatchResults(
  items: MeaningGradeInput[],
  content: string
): MeaningGradeResult[] | null {
  try {
    const graded = JSON.parse(content) as {
      results?: {
        index: number;
        isCorrect: boolean;
        feedback?: string;
        reason?: string;
      }[];
    };

    const byIndex = new Map(
      (graded.results ?? []).map((r) => [r.index, r])
    );

    return items.map((_, i) => {
      const row = byIndex.get(i + 1);
      const feedback = row?.feedback ?? row?.reason;
      return {
        isCorrect: Boolean(row?.isCorrect),
        feedback: feedback?.trim() || undefined,
      };
    });
  } catch {
    return null;
  }
}

function fallbackResults(items: MeaningGradeInput[]): MeaningGradeResult[] {
  return items.map((input) => {
    const isCorrect = gradeMeaningFallback(
      input.correctMeaning,
      input.studentAnswer
    );
    return {
      isCorrect,
      feedback: fallbackMeaningFeedback(isCorrect),
    };
  });
}

async function gradeMeaningChunkWithAi(
  items: MeaningGradeInput[]
): Promise<
  { ok: true; results: MeaningGradeResult[] } | { ok: false; message: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, message: "OPENAI_API_KEY가 설정되어 있지 않습니다." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEANING_AI_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildBatchPrompt(items) },
        ],
      }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      return { ok: false, message: openAiErrorMessage(res.status, bodyText) };
    }

    const parsed = JSON.parse(bodyText) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = parsed.choices?.[0]?.message?.content ?? "{}";
    const results = parseBatchResults(items, content);
    if (!results) {
      return { ok: false, message: "AI 채점 결과를 해석하지 못했습니다." };
    }
    return { ok: true, results };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, message: "AI 채점 시간이 초과되었습니다." };
    }
    return { ok: false, message: "AI 채점 요청에 실패했습니다." };
  } finally {
    clearTimeout(timer);
  }
}

/** Batch meaning grade via OpenAI (chunked + limited concurrency) */
export async function gradeMeaningWithAi(
  items: MeaningGradeInput[]
): Promise<
  { ok: true; results: MeaningGradeResult[] } | { ok: false; message: string }
> {
  if (items.length === 0) {
    return { ok: true, results: [] };
  }

  const chunks: MeaningGradeInput[][] = [];
  for (let i = 0; i < items.length; i += MEANING_CHUNK_SIZE) {
    chunks.push(items.slice(i, i + MEANING_CHUNK_SIZE));
  }

  const allResults: MeaningGradeResult[] = [];

  for (let i = 0; i < chunks.length; i += MEANING_CHUNK_CONCURRENCY) {
    const batch = chunks.slice(i, i + MEANING_CHUNK_CONCURRENCY);
    const batchOutcomes = await Promise.all(
      batch.map(async (chunk) => {
        const result = await gradeMeaningChunkWithAi(chunk);
        if (result.ok) return result.results;
        return fallbackResults(chunk).map((r) => ({
          ...r,
          feedback: `${r.feedback ?? fallbackMeaningFeedback(r.isCorrect)} (${result.message})`,
        }));
      })
    );
    for (const chunkResults of batchOutcomes) {
      allResults.push(...chunkResults);
    }
  }

  return { ok: true, results: allResults };
}

/** Single item — wraps batch helper */
export async function gradeMeaningSingleWithAi(
  input: MeaningGradeInput
): Promise<
  | { ok: true; isCorrect: boolean; feedback?: string }
  | { ok: false; message: string }
> {
  const result = await gradeMeaningWithAi([input]);
  if (!result.ok) return result;
  const row = result.results[0];
  return {
    ok: true,
    isCorrect: row?.isCorrect ?? false,
    feedback: row?.feedback,
  };
}

/** Fallback when AI unavailable */
export function gradeMeaningFallback(
  correct: string,
  student: string
): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[.,!?]/g, "");
  const a = norm(correct);
  const b = norm(student);
  if (!b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

export function fallbackMeaningFeedback(isCorrect: boolean): string {
  return isCorrect
    ? "유사 표현으로 정답 처리했습니다."
    : "정답과 일치하지 않습니다.";
}
