import { flattenCourseLessons } from "@/lib/courses/course-lessons";
import { calculateCourseProgress } from "@/lib/progress/calculate";
import type { Lesson, LessonProgress, Section } from "@/types/database";

export interface LessonProgressDetail {
  lessonId: string;
  lessonTitle: string;
  orderIndex: number;
  progressPercent: number;
  watchedSeconds: number;
  isCompleted: boolean;
  lastWatchedAt: string | null;
  completedAt: string | null;
}

/** 학생 이름·이메일 부분 일치 검색 (대소문자 무시). */
export function matchesStudentSearch(
  row: Pick<EnrollmentProgressRow, "studentName" | "studentEmail">,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.studentName.toLowerCase().includes(q) ||
    row.studentEmail.toLowerCase().includes(q)
  );
}

export interface EnrollmentProgressRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  lastStudiedAt: string | null;
  lessons: LessonProgressDetail[];
}

type LessonRow = Pick<
  Lesson,
  "id" | "course_id" | "title" | "order_index" | "section_id" | "is_published"
>;
type SectionRow = Pick<Section, "id" | "course_id" | "order_index">;
type ProgressRow = Pick<
  LessonProgress,
  | "student_id"
  | "lesson_id"
  | "is_completed"
  | "last_watched_at"
  | "completed_at"
  | "progress_percent"
  | "watched_seconds"
>;

export interface EnrollmentInput {
  student_id: string;
  course_id: string;
  student?: { name: string; email: string } | null;
  course?: { title: string } | null;
}

type RawEnrollmentRow = {
  student_id: string;
  course_id: string;
  student?:
    | { name: string; email: string }
    | { name: string; email: string }[]
    | null;
  course?: { title: string } | { title: string }[] | null;
};

export function unwrapRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** Supabase join rows may return nested relations as object or single-element array. */
export function normalizeEnrollmentInputs(
  rows: RawEnrollmentRow[]
): EnrollmentInput[] {
  return rows.map((row) => ({
    student_id: row.student_id,
    course_id: row.course_id,
    student: unwrapRelation(row.student),
    course: unwrapRelation(row.course),
  }));
}

function maxStudyDate(
  publishedLessonIds: Set<string>,
  records: ProgressRow[]
): string | null {
  let latest: Date | null = null;

  for (const record of records) {
    if (!publishedLessonIds.has(record.lesson_id)) continue;

    for (const value of [record.last_watched_at, record.completed_at]) {
      if (!value) continue;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime()) && (!latest || date > latest)) {
        latest = date;
      }
    }
  }

  return latest ? latest.toISOString() : null;
}

export function buildEnrollmentProgressRows(
  enrollments: EnrollmentInput[],
  sections: SectionRow[],
  lessons: LessonRow[],
  progressRecords: ProgressRow[]
): EnrollmentProgressRow[] {
  const lessonsByCourse = orderedPublishedLessonsByCourse(sections, lessons);

  const progressByKey = new Map<string, ProgressRow>();
  const progressByStudent = new Map<string, ProgressRow[]>();
  for (const record of progressRecords) {
    progressByKey.set(progressKey(record.student_id, record.lesson_id), record);
    const list = progressByStudent.get(record.student_id) ?? [];
    list.push(record);
    progressByStudent.set(record.student_id, list);
  }

  return enrollments.map((enrollment) => {
    const publishedLessons =
      lessonsByCourse.get(enrollment.course_id) ?? [];
    const publishedIds = new Set(publishedLessons.map((l) => l.id));

    const studentProgress = (
      progressByStudent.get(enrollment.student_id) ?? []
    ).filter((p) => publishedIds.has(p.lesson_id));

    const stats = calculateCourseProgress(
      publishedLessons,
      studentProgress.map((p) => ({
        lesson_id: p.lesson_id,
        is_completed: p.is_completed,
      }))
    );

    const lessonDetails = buildLessonDetails(
      enrollment.student_id,
      publishedLessons,
      progressByKey
    );

    return {
      studentId: enrollment.student_id,
      studentName: enrollment.student?.name ?? "—",
      studentEmail: enrollment.student?.email ?? "—",
      courseId: enrollment.course_id,
      courseTitle: enrollment.course?.title ?? "—",
      totalLessons: stats.totalLessons,
      completedLessons: stats.completedLessons,
      progressPercent: stats.progressPercent,
      lastStudiedAt: maxStudyDate(publishedIds, studentProgress),
      lessons: lessonDetails,
    };
  });
}

export function formatLastStudiedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatStudyDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWatchedDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe === 0) return "0초";
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  }
  return `${secs}초`;
}

function progressKey(studentId: string, lessonId: string): string {
  return `${studentId}:${lessonId}`;
}

function orderedPublishedLessonsByCourse(
  sections: SectionRow[],
  lessons: LessonRow[]
): Map<string, LessonRow[]> {
  const byCourse = new Map<string, LessonRow[]>();
  const courseIds = new Set(lessons.map((l) => l.course_id));

  for (const courseId of courseIds) {
    const courseSections = sections.filter((s) => s.course_id === courseId);
    const courseLessons = lessons.filter((l) => l.course_id === courseId);
    const flat = flattenCourseLessons(
      courseSections as Section[],
      courseLessons as Lesson[]
    ) as LessonRow[];
    byCourse.set(
      courseId,
      flat.filter((l) => l.is_published)
    );
  }

  return byCourse;
}

function buildLessonDetails(
  studentId: string,
  publishedLessons: LessonRow[],
  progressByKey: Map<string, ProgressRow>
): LessonProgressDetail[] {
  return publishedLessons.map((lesson, index) => {
    const record = progressByKey.get(progressKey(studentId, lesson.id));
    const progressPercent =
      record && typeof record.progress_percent === "number"
        ? Math.min(100, Math.max(0, record.progress_percent))
        : 0;
    const watchedSeconds =
      record && typeof record.watched_seconds === "number"
        ? Math.max(0, record.watched_seconds)
        : 0;

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      orderIndex: index + 1,
      progressPercent,
      watchedSeconds,
      isCompleted: record?.is_completed ?? false,
      lastWatchedAt: record?.last_watched_at ?? null,
      completedAt: record?.completed_at ?? null,
    };
  });
}
