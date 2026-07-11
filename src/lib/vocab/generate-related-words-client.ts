export interface GenerateRelatedInput {
  word: string;
  meaning: string;
}

export interface GenerateRelatedResult {
  word: string;
  meaning: string;
  synonyms: string;
  antonyms: string;
}

export type RelatedWordsKind = "synonyms" | "antonyms" | "both";

export async function fetchGeneratedRelatedWords(
  items: GenerateRelatedInput[],
  kind: RelatedWordsKind = "both"
): Promise<
  | { ok: true; items: GenerateRelatedResult[]; kind: RelatedWordsKind }
  | { ok: false; message: string }
> {
  try {
    const res = await fetch("/api/vocab/generate-related-words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, kind }),
      credentials: "same-origin",
    });

    let data: {
      ok: boolean;
      message?: string;
      items?: GenerateRelatedResult[];
      kind?: RelatedWordsKind;
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
        message: data.message ?? "AI 생성에 실패했습니다.",
      };
    }

    return {
      ok: true,
      items: data.items,
      kind: data.kind ?? kind,
    };
  } catch {
    return { ok: false, message: "AI 생성에 실패했습니다." };
  }
}
