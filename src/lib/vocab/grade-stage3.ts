import { gradeSpellingAnswer } from "@/lib/vocab/grade-spelling";
import type { Stage3QuestionType } from "@/lib/vocab/build-stage3-questions";

export function normalizeMeaningAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function gradeMeaningAnswer(
  correctMeaning: string,
  studentAnswer: string
): boolean {
  const student = normalizeMeaningAnswer(studentAnswer);
  if (!student) return false;
  return normalizeMeaningAnswer(correctMeaning) === student;
}

export function gradeStage3Answer(
  questionType: Stage3QuestionType,
  correctAnswer: string,
  studentAnswer: string
): boolean {
  if (questionType === "spelling") {
    return gradeSpellingAnswer(correctAnswer, studentAnswer);
  }
  return gradeMeaningAnswer(correctAnswer, studentAnswer);
}
