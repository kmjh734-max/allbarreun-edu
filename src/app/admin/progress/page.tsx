import { createClient } from "@/lib/supabase/server";
import { EnrollmentProgressDetailTable } from "@/components/progress/EnrollmentProgressDetailTable";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  buildEnrollmentProgressRows,
  normalizeEnrollmentInputs,
} from "@/lib/progress/enrollment-progress";
import type { Lesson, LessonProgress, Section } from "@/types/database";

export default async function AdminProgressPage() {
  const supabase = await createClient();

  const [{ data: enrollments }, { data: sections }, { data: lessons }, { data: progress }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          "student_id, course_id, student:profiles!enrollments_student_id_fkey(name, email), course:courses(title)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("sections").select("id, course_id, order_index"),
      supabase
        .from("lessons")
        .select("id, course_id, title, order_index, section_id, is_published"),
      supabase
        .from("lesson_progress")
        .select(
          "student_id, lesson_id, is_completed, last_watched_at, completed_at, progress_percent, watched_seconds"
        ),
    ]);

  const rows = buildEnrollmentProgressRows(
    normalizeEnrollmentInputs(enrollments ?? []),
    (sections ?? []) as Pick<Section, "id" | "course_id" | "order_index">[],
    (lessons ?? []) as Pick<
      Lesson,
      "id" | "course_id" | "title" | "order_index" | "section_id" | "is_published"
    >[],
    (progress ?? []) as Pick<
      LessonProgress,
      | "student_id"
      | "lesson_id"
      | "is_completed"
      | "last_watched_at"
      | "completed_at"
      | "progress_percent"
      | "watched_seconds"
    >[]
  );

  rows.sort((a, b) => {
    const name = a.studentName.localeCompare(b.studentName, "ko");
    if (name !== 0) return name;
    return a.courseTitle.localeCompare(b.courseTitle, "ko");
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="수강 현황"
        description="학생 이름으로 검색해 강좌별 진도·영상별 시청 기록을 확인합니다."
      />
      <EnrollmentProgressDetailTable rows={rows} />
    </div>
  );
}
