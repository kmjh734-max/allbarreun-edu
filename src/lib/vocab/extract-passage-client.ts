import type { PassageVocabItem } from "@/lib/vocab/extract-passage-vocabulary";

export async function fetchPassageVocabulary(
  passage: string
): Promise<
  | { ok: true; items: PassageVocabItem[] }
  | { ok: false; message: string }
> {
  try {
    const res = await fetch("/api/vocab/extract-from-passage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passage }),
      credentials: "same-origin",
    });

    let data: {
      ok: boolean;
      message?: string;
      items?: PassageVocabItem[];
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
        message: data.message ?? "지문에서 단어를 추출하지 못했습니다.",
      };
    }

    return { ok: true, items: data.items };
  } catch {
    return { ok: false, message: "지문에서 단어를 추출하지 못했습니다." };
  }
}
