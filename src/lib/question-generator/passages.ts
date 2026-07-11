import type {
  GenerationRequestConfig,
  PassageInput,
} from "@/lib/question-generator/types";

export type ResolvedPassage = {
  title: string;
  text: string;
  sourceDetail: string;
  clientId?: string;
};

/** config에서 유효 지문 목록 추출 (다중 우선, 없으면 단일 passage) */
export function resolvePassages(
  config: GenerationRequestConfig
): ResolvedPassage[] {
  const sharedTitle = (config.title ?? "").trim() || "무제 지문";
  const sharedDetail = (config.sourceDetail ?? "").trim();

  const fromList: ResolvedPassage[] = [];
  for (let i = 0; i < (config.passages ?? []).length; i++) {
    const p = config.passages![i]!;
    const text = (p.text ?? "").trim();
    if (!text) continue;
    const title =
      (p.title ?? "").trim() ||
      ((config.passages?.length ?? 0) > 1
        ? `${sharedTitle} · 지문 ${i + 1}`
        : sharedTitle);
    fromList.push({
      title,
      text,
      sourceDetail: (p.sourceDetail ?? "").trim() || sharedDetail,
      clientId: p.clientId,
    });
  }

  if (fromList.length > 0) return fromList;

  const single = (config.passage ?? "").trim();
  if (!single) return [];
  return [
    {
      title: sharedTitle,
      text: single,
      sourceDetail: sharedDetail,
    },
  ];
}

export function emptyPassageInput(clientId?: string): PassageInput {
  return {
    clientId:
      clientId ??
      `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    sourceDetail: "",
    text: "",
  };
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
