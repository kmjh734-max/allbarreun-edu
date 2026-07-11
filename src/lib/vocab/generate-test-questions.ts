import type { VocabItem } from "@/types/database";
import type { VocabTestType } from "@/lib/vocab/test-types";

export interface SerializedTestQuestion {
  itemId: string;
  questionType: VocabTestType;
  questionText: string;
  promptExtra: string | null;
  choices: string[] | null;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickDistractors(
  pool: string[],
  correct: string,
  count: number
): string[] {
  const unique = [...new Set(pool.filter((v) => v.trim() && v !== correct))];
  return shuffle(unique).slice(0, count);
}

export function buildSpellingPrompt(item: VocabItem): string {
  if (item.example_sentence?.trim()) {
    const blanked = item.example_sentence.replace(
      new RegExp(`\\b${escapeRegExp(item.word)}\\b`, "gi"),
      "______"
    );
    return `예문: ${blanked}`;
  }
  return "";
}

export function buildChoices(
  items: VocabItem[],
  target: VocabItem,
  pick: (item: VocabItem) => string
): string[] | null {
  const correct = pick(target).trim();
  if (!correct) return null;

  const pool = items.map(pick).filter(Boolean);
  const distractorCount = Math.min(3, pool.length - 1);
  if (distractorCount < 1) return [correct];

  const distractors = pickDistractors(pool, correct, distractorCount);
  const choices = shuffle([correct, ...distractors]);
  return choices.length >= 2 ? choices : [correct, ...distractors].slice(0, 2);
}

export function canStartVocabTest(itemCount: number): boolean {
  return itemCount >= 2;
}

export function generateTestQuestions(
  items: VocabItem[],
  testType: VocabTestType
): SerializedTestQuestion[] {
  const ordered = shuffle(items);

  return ordered.map((item) => {
    if (testType === "meaning_choice") {
      const choices = buildChoices(items, item, (i) => i.meaning);
      return {
        itemId: item.id,
        questionType: testType,
        questionText: item.word,
        promptExtra: null,
        choices,
      };
    }

    if (testType === "word_choice") {
      const choices = buildChoices(items, item, (i) => i.word);
      return {
        itemId: item.id,
        questionType: testType,
        questionText: item.meaning,
        promptExtra: null,
        choices,
      };
    }

    return {
      itemId: item.id,
      questionType: testType,
      questionText: item.meaning,
      promptExtra: buildSpellingPrompt(item) || null,
      choices: null,
    };
  });
}

export function getCorrectAnswer(
  item: VocabItem,
  testType: VocabTestType
): string {
  if (testType === "word_choice") return item.word.trim();
  if (testType === "meaning_choice") return item.meaning.trim();
  return item.word.trim();
}
