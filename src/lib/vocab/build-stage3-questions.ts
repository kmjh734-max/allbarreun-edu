import type { VocabItem } from "@/types/database";

export type Stage3QuestionType = "meaning" | "spelling";

export interface Stage3Question {
  itemId: string;
  questionType: Stage3QuestionType;
  questionText: string;
  promptExtra: string | null;
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

export function buildStage3Questions(items: VocabItem[]): Stage3Question[] {
  const shuffled = shuffle(items);
  const half = Math.ceil(shuffled.length / 2);
  const meaningItems = shuffled.slice(0, half);
  const spellingItems = shuffled.slice(half);

  const meaningQs: Stage3Question[] = meaningItems.map((item) => ({
    itemId: item.id,
    questionType: "meaning",
    questionText: item.word.trim(),
    promptExtra: "영어 단어의 뜻을 입력하세요.",
    correctAnswer: item.meaning.trim(),
  }));

  const spellingQs: Stage3Question[] = spellingItems.map((item) => ({
    itemId: item.id,
    questionType: "spelling",
    questionText: item.meaning.trim(),
    promptExtra: "한글뜻에 맞는 영어 단어를 입력하세요.",
    correctAnswer: item.word.trim(),
  }));

  return shuffle([...meaningQs, ...spellingQs]);
}

export const STAGE3_PASS_SCORE = 90;
export const STAGE4_PASS_SCORE = STAGE3_PASS_SCORE;
