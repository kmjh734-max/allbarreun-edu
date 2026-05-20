import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { TeacherCourseList } from "@/components/teacher/TeacherCourseList";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import type { Course } from "@/types/database";

export default async function TeacherCoursesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", profile!.id)
    .order("created_at", { ascending: false });

  const list = (courses ?? []) as Course[];
  const courseIds = list.map((c) => c.id);

  const { data: lessonRows } =
    courseIds.length > 0
      ? await supabase
          .from("lessons")
          .select("course_id")
          .in("course_id", courseIds)
      : { data: [] as { course_id: string }[] };

  const lessonCountByCourse = new Map<string, number>();
  for (const row of lessonRows ?? []) {
    lessonCountByCourse.set(
      row.course_id,
      (lessonCountByCourse.get(row.course_id) ?? 0) + 1
    );
  }

  return (
    <div>
      <PageHeader
        title="강좌 관리"
        description="담당 강좌의 영상과 공개 설정을 관리합니다."
        action={
          <ButtonLink href="/teacher/courses/new" variant="primary" size="sm">
            + 새 강좌
          </ButtonLink>
        }
      />
      <TeacherCourseList
        courses={list}
        lessonCountByCourse={lessonCountByCourse}
      />
    </div>
  );
}
