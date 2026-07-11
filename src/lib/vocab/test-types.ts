export const VOCAB_TEST_TYPES = [
  "meaning_choice",
  "word_choice",
  "spelling",
  "final_exam",
] as const;

export type VocabTestType = (typeof VOCAB_TEST_TYPES)[number];

export function isVocabTestType(value: string): value is VocabTestType {
  return (VOCAB_TEST_TYPES as readonly string[]).includes(value);
}

export function vocabTestTypeLabel(type: VocabTestType | string): string {
  switch (type) {
    case "meaning_choice":
      return "뜻 고르기";
    case "word_choice":
      return "단어 고르기";
    case "spelling":
      return "스펠 테스트";
    case "final_exam":
      return "최종 테스트";
    case "meaning_ai":
      return "한글 뜻 (AI)";
    default:
      return String(type);
  }
}

export function vocabTestTypePath(type: VocabTestType): string {
  return type.replace("_", "-");
}

export function parseVocabTestTypeParam(
  raw: string | undefined
): VocabTestType | null {
  if (!raw) return null;
  const normalized = raw.replace(/-/g, "_");
  return isVocabTestType(normalized) ? normalized : null;
}
