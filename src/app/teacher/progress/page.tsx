import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { EnrollmentProgressDetailTable } from "@/components/progress/EnrollmentProgressDetailTable";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  buildEnrollmentProgressRows,
  normalizeEnrollmentInputs,
} from "@/lib/progress/enrollment-progress";
import type { Lesson, LessonProgress, Section } from "@/types/database";

export default async function TeacherProgressPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: myCourses } = await supabase
    .from("courses")
    .select("id")
    .eq("teacher_id", profile!.id);

  const courseIds = (myCourses ?? []).map((c) => c.id);

  if (courseIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">수강 현황</h2>
          <p className="mt-1 text-sm text-slate-600">
            담당 강좌에 배정된 학생의 영상별 학습 기록을 확인합니다.
          </p>
        </div>
        <EnrollmentProgressDetailTable rows={[]} />
      </div>
    );
  }

  const [{ data: enrollments }, { data: sections }, { data: lessons }, { data: progress }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          "student_id, course_id, student:profiles!enrollments_student_id_fkey(name, email), course:courses(title)"
        )
        .in("course_id", courseIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("sections")
        .select("id, course_id, order_index")
        .in("course_id", courseIds),
      supabase
        .from("lessons")
        .select("id, course_id, title, order_index, section_id, is_published")
        .in("course_id", courseIds),
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
    const course = a.courseTitle.localeCompare(b.courseTitle, "ko");
    if (course !== 0) return course;
    return a.studentName.localeCompare(b.studentName, "ko");
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="수강 현황"
        description="학생별·강좌별 진도와 영상별 시청 기록을 확인합니다."
      />
      <EnrollmentProgressDetailTable rows={rows} />
    </div>
  );
}
