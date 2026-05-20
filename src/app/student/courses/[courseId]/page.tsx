import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { calculateCourseProgress } from "@/lib/progress/calculate";
import { flattenCourseLessons } from "@/lib/courses/course-lessons";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Course, Lesson, Section } from "@/types/database";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function StudentCoursePage({ params }: PageProps) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", profile!.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!enrollment) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  const [{ data: sections }, { data: lessons }, { data: progress }] =
    await Promise.all([
      supabase
        .from("sections")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index"),
      supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index"),
      supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("student_id", profile!.id),
    ]);

  const sectionList = (sections ?? []) as Section[];
  const lessonList = (lessons ?? []) as Lesson[];
  const flatLessons = flattenCourseLessons(sectionList, lessonList);
  const progressMap = new Map(
    (progress ?? []).map((p) => [p.lesson_id, p.is_completed])
  );

  const stats = calculateCourseProgress(lessonList, progress ?? []);

  return (
    <div className="space-y-6">
      <Link href="/student" className="text-sm font-medium text-brand-600 hover:underline">
        ← 내 강의실
      </Link>

      <div className="ui-section-card">
        <h1 className="text-lg font-semibold text-slate-900">
          {(course as Course).title}
        </h1>
        <div className="mt-4 max-w-md">
          <ProgressBar
            percent={stats.progressPercent}
            label={`${stats.completedLessons} / ${stats.totalLessons} 영상 완료`}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {flatLessons.length === 0 ? (
          <li className="text-sm text-slate-500">등록된 영상이 없습니다.</li>
        ) : (
          flatLessons.map((lesson, index) => {
            const done = progressMap.get(lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/student/courses/${courseId}/lessons/${lesson.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-card transition hover:border-brand-200"
                >
                  <span>
                    <span className="font-medium text-brand-800">
                      {index + 1}강
                    </span>{" "}
                    {lesson.title}
                  </span>
                  {done ? (
                    <Badge variant="success">완료</Badge>
                  ) : (
                    <Badge variant="neutral">미완료</Badge>
                  )}
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
