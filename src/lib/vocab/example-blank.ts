import { gradeSpellingAnswer, normalizeSpellingAnswer } from "@/lib/vocab/grade-spelling";
import type { VocabItem } from "@/types/database";

export interface ExampleBlankQuestion {
  itemId: string;
  word: string;
  blankSentence: string;
  sentenceToken: string;
  exampleMeaning: string | null;
  acceptedAnswers: string[];
}

/** Word in sentence matches vocab word (exact or simple inflection like provide/provides). */
export function wordsMatchForBlank(vocabWord: string, token: string): boolean {
  const w = normalizeSpellingAnswer(vocabWord);
  const t = normalizeSpellingAnswer(token);
  if (!w || !t) return false;
  if (w === t) return true;

  const shorter = w.length <= t.length ? w : t;
  const longer = w.length <= t.length ? t : w;
  if (longer.startsWith(shorter) && longer.length - shorter.length <= 4) {
    return true;
  }
  return false;
}

export function extractAcceptedAnswers(
  word: string,
  exampleSentence: string
): string[] {
  const answers = new Set<string>();
  const base = word.trim();
  if (base) answers.add(base);

  const tokens = exampleSentence.match(/[\w'-]+/g) ?? [];
  for (const token of tokens) {
    if (wordsMatchForBlank(base, token)) {
      answers.add(token);
    }
  }
  return [...answers];
}

export function buildExampleBlankQuestion(
  item: VocabItem
): ExampleBlankQuestion | null {
  const sentence = item.example_sentence?.trim();
  const word = item.word?.trim();
  if (!sentence || !word) return null;

  const matches = [...sentence.matchAll(/[\w'-]+/g)];
  for (const match of matches) {
    const token = match[0];
    if (!wordsMatchForBlank(word, token)) continue;

    const start = match.index ?? 0;
    const end = start + token.length;
    const blankSentence =
      sentence.slice(0, start) + "______" + sentence.slice(end);

    const exampleMeaning = item.example_meaning?.trim() || null;

    return {
      itemId: item.id,
      word,
      blankSentence,
      sentenceToken: token,
      exampleMeaning,
      acceptedAnswers: extractAcceptedAnswers(word, sentence),
    };
  }

  return null;
}

export function buildExampleBlankQuestions(
  items: VocabItem[]
): ExampleBlankQuestion[] {
  return items
    .map(buildExampleBlankQuestion)
    .filter((q): q is ExampleBlankQuestion => q !== null);
}

export function gradeExampleBlankAnswer(
  acceptedAnswers: string[],
  studentAnswer: string
): boolean {
  const trimmed = studentAnswer.trim();
  if (!trimmed) return false;
  return acceptedAnswers.some((a) => gradeSpellingAnswer(a, trimmed));
}
