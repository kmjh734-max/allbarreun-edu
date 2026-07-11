import type { ReactNode } from "react";

/** 예문 안의 단어를 시중 단어장처럼 강조 표시 */
export function highlightWordInSentence(
  sentence: string,
  word: string
): ReactNode {
  const trimmed = word.trim();
  if (!trimmed) return sentence;

  const lower = sentence.toLowerCase();
  const target = trimmed.toLowerCase();
  let idx = lower.indexOf(target);

  if (idx === -1) {
    const stem = target.replace(/(e|ed|ing|s)$/, "");
    if (stem.length >= 3) {
      const re = new RegExp(`\\b${escapeRegExp(stem)}\\w*`, "i");
      const match = sentence.match(re);
      if (match?.index !== undefined) {
        idx = match.index;
        const matched = match[0];
        return (
          <>
            {sentence.slice(0, idx)}
            <mark className="vocab-print-highlight">{matched}</mark>
            {sentence.slice(idx + matched.length)}
          </>
        );
      }
    }
    return sentence;
  }

  const matched = sentence.slice(idx, idx + trimmed.length);
  return (
    <>
      {sentence.slice(0, idx)}
      <mark className="vocab-print-highlight">{matched}</mark>
      {sentence.slice(idx + trimmed.length)}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
