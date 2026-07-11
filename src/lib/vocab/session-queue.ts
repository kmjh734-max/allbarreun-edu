import type { VocabItem, VocabProgressStatus } from "@/types/database";
import type { VocabTestType } from "@/lib/vocab/test-types";
import {
  buildChoices,
  buildSpellingPrompt,
  type SerializedTestQuestion,
} from "@/lib/vocab/generate-test-questions";

export type LearningStepType = "meaning_choice" | "word_choice";

export interface LearningStep {
  itemId: string;
  testType: LearningStepType;
  question: SerializedTestQuestion;
  correctAnswer: string;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildLearningQueue(
  items: VocabItem[],
  statusByItemId: Map<string, VocabProgressStatus>
): string[] {
  const learning = items.filter(
    (i) => (statusByItemId.get(i.id) ?? "unknown") !== "known"
  );
  const reviewFirst = learning.filter(
    (i) => (statusByItemId.get(i.id) ?? "unknown") === "review"
  );
  const unknown = learning.filter(
    (i) => (statusByItemId.get(i.id) ?? "unknown") === "unknown"
  );
  return shuffle([...reviewFirst, ...unknown]).map((i) => i.id);
}

export function buildLearningSteps(
  items: VocabItem[],
  queue: string[]
): LearningStep[] {
  const itemById = new Map(items.map((i) => [i.id, i]));

  return queue.map((itemId, index) => {
    const item = itemById.get(itemId)!;
    const testType: LearningStepType =
      index % 2 === 0 ? "meaning_choice" : "word_choice";

    if (testType === "meaning_choice") {
      const choices = buildChoices(items, item, (i) => i.meaning);
      return {
        itemId,
        testType,
        correctAnswer: item.meaning.trim(),
        question: {
          itemId,
          questionType: testType,
          questionText: item.word,
          promptExtra: null,
          choices,
        },
      };
    }

    const choices = buildChoices(items, item, (i) => i.word);
    return {
      itemId,
      testType,
      correctAnswer: item.word.trim(),
      question: {
        itemId,
        questionType: testType,
        questionText: item.meaning,
        promptExtra: null,
        choices,
      },
    };
  });
}

export type FinalQuestionType = "meaning_ai" | "spelling";

export interface FinalExamQuestion {
  itemId: string;
  questionType: FinalQuestionType;
  questionText: string;
  promptExtra: string | null;
  correctAnswer: string;
}

export function buildFinalExamQuestions(items: VocabItem[]): FinalExamQuestion[] {
  const shuffled = shuffle(items);
  const half = Math.ceil(shuffled.length / 2);
  const meaningItems = shuffled.slice(0, half);
  const spellingItems = shuffled.slice(half);

  const meaningQs: FinalExamQuestion[] = meaningItems.map((item) => ({
    itemId: item.id,
    questionType: "meaning_ai",
    questionText: item.word,
    promptExtra: "한국어 뜻을 입력하세요. 비슷한 표현도 정답으로 인정됩니다.",
    correctAnswer: item.meaning.trim(),
  }));

  const spellingQs: FinalExamQuestion[] = spellingItems.map((item) => ({
    itemId: item.id,
    questionType: "spelling",
    questionText: item.meaning,
    promptExtra: buildSpellingPrompt(item) || null,
    correctAnswer: item.word.trim(),
  }));

  return shuffle([...meaningQs, ...spellingQs]);
}

export function sessionProgressPercent(roundsCompleted: number): number {
  return roundsCompleted * 100;
}

export function isVocabTestTypeForChoice(
  type: VocabTestType | LearningStepType
): boolean {
  return type === "meaning_choice" || type === "word_choice";
}
