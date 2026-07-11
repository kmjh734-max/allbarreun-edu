import type { VocabItem } from "@/types/database";
import type { VocabTestType } from "@/lib/vocab/test-types";
import {
  buildChoices,
  getCorrectAnswer,
} from "@/lib/vocab/generate-test-questions";

import {
  gradeSpellingAnswer,
  normalizeSpellingAnswer,
} from "@/lib/vocab/grade-spelling";

export { normalizeSpellingAnswer };

export function gradeStudentAnswer(
  testType: VocabTestType,
  correctAnswer: string,
  studentAnswer: string
): boolean {
  const student = studentAnswer.trim();
  if (!student) return false;

  if (testType === "spelling") {
    return gradeSpellingAnswer(correctAnswer, student);
  }

  return student === correctAnswer.trim();
}

export interface GradedTestAnswer {
  itemId: string;
  questionType: VocabTestType;
  questionText: string;
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
  choices: string[] | null;
}

function questionTextForItem(item: VocabItem, testType: VocabTestType): string {
  if (testType === "meaning_choice") return item.word;
  return item.meaning;
}

function choicesForItem(
  items: VocabItem[],
  item: VocabItem,
  testType: VocabTestType
): string[] | null {
  if (testType === "meaning_choice") {
    return buildChoices(items, item, (i) => i.meaning);
  }
  if (testType === "word_choice") {
    return buildChoices(items, item, (i) => i.word);
  }
  return null;
}

export function gradeVocabTestSubmission(
  items: VocabItem[],
  testType: VocabTestType,
  answerByItemId: Map<string, string>,
  itemOrder: string[]
): {
  graded: GradedTestAnswer[];
  correctCount: number;
  totalQuestions: number;
  score: number;
} {
  const itemById = new Map(items.map((i) => [i.id, i]));

  const graded: GradedTestAnswer[] = itemOrder.map((itemId) => {
    const item = itemById.get(itemId);
    if (!item) {
      return {
        itemId,
        questionType: testType,
        questionText: "",
        correctAnswer: "",
        studentAnswer: answerByItemId.get(itemId)?.trim() ?? "",
        isCorrect: false,
        choices: null,
      };
    }

    const correctAnswer = getCorrectAnswer(item, testType);
    const studentAnswer = answerByItemId.get(itemId)?.trim() ?? "";
    const isCorrect = gradeStudentAnswer(
      testType,
      correctAnswer,
      studentAnswer
    );

    return {
      itemId,
      questionType: testType,
      questionText: questionTextForItem(item, testType),
      correctAnswer,
      studentAnswer,
      isCorrect,
      choices: choicesForItem(items, item, testType),
    };
  });

  const totalQuestions = graded.length;
  const correctCount = graded.filter((g) => g.isCorrect).length;
  const score =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  return {
    graded,
    correctCount,
    totalQuestions,
    score,
  };
}
