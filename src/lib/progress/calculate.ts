import type { Lesson, LessonProgress } from "@/types/database";

export function calculateCourseProgress(
  lessons: Pick<Lesson, "id" | "is_published">[],
  progressRecords: Pick<LessonProgress, "lesson_id" | "is_completed">[]
): {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
} {
  const publishedLessons = lessons.filter((l) => l.is_published);
  const totalLessons = publishedLessons.length;

  if (totalLessons === 0) {
    return { totalLessons: 0, completedLessons: 0, progressPercent: 0 };
  }

  const completedSet = new Set(
    progressRecords
      .filter((p) => p.is_completed)
      .map((p) => p.lesson_id)
  );

  const completedLessons = publishedLessons.filter((l) =>
    completedSet.has(l.id)
  ).length;

  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  return { totalLessons, completedLessons, progressPercent };
}
