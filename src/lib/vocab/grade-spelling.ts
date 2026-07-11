/** Stage 2/3 spelling: ignore case, trim, collapse spaces */
export function normalizeSpellingAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[-–—]/g, "-");
}

export function gradeSpellingAnswer(
  correctAnswer: string,
  studentAnswer: string
): boolean {
  const student = studentAnswer.trim();
  if (!student) return false;
  return (
    normalizeSpellingAnswer(student) ===
    normalizeSpellingAnswer(correctAnswer)
  );
}
