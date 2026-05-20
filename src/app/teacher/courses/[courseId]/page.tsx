import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { resolveLessonTeacherId } from "@/lib/courses/resolve-lesson-teacher-id";
import { flattenCourseLessons } from "@/lib/courses/course-lessons";
import { CourseSettingsForm } from "@/components/courses/CourseSettingsForm";
import { CourseStudentVisibilityBanner } from "@/components/courses/CourseStudentVisibilityBanner";
import { CourseVideoManager } from "@/components/courses/CourseVideoManager";
import { unwrapRelation } from "@/lib/progress/enrollment-progress";
import type { Course, Lesson, Section } from "@/types/database";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function TeacherCoursePage({ params }: PageProps) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("teacher_id", profile!.id)
    .single();

  if (!course) notFound();

  const typedCourse = course as Course;

  const [
    { data: sections },
    { data: lessons, error: lessonsError },
    { data: enrollments },
  ] =
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
        .order("order_index"),
      supabase
        .from("enrollments")
        .select("student_id, student:profiles!enrollments_student_id_fkey(name)")
        .eq("course_id", courseId),
    ]);

  const sectionList = (sections ?? []) as Section[];
  const lessonList = (lessons ?? []) as Lesson[];
  const flatLessons = flattenCourseLessons(sectionList, lessonList);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/teacher" className="text-sm text-brand-600 hover:underline">
          ← 강좌 관리
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{typedCourse.title}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              typedCourse.is_published
                ? "bg-green-100 text-green-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {typedCourse.is_published ? "공개" : "비공개"}
          </span>
          <span className="text-sm text-slate-500">
            영상 {flatLessons.length}개
          </span>
        </div>
        {typedCourse.description && (
          <p className="mt-2 text-sm text-slate-600">{typedCourse.description}</p>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-900">강좌 기본 정보</h3>
        <CourseSettingsForm
          variant="teacher"
          course={typedCourse}
          listHref="/teacher"
        />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">영상 관리</h3>
        <CourseStudentVisibilityBanner
          courseId={courseId}
          courseTitle={typedCourse.title}
          courseIsPublished={typedCourse.is_published}
          publishedLessonCount={
            lessonList.filter((l) => l.is_published).length
          }
          totalLessonCount={lessonList.length}
          enrollmentCount={(enrollments ?? []).length}
        />
        {lessonsError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            영상 목록을 불러오지 못했습니다: {lessonsError.message}
          </p>
        )}
        <CourseVideoManager
          courseId={courseId}
          teacherId={resolveLessonTeacherId(
            typedCourse.teacher_id,
            profile!.id
          )}
          lessons={flatLessons}
          apiVariant="teacher"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold">수강 학생</h3>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {(enrollments ?? []).length === 0 ? (
            <li className="px-4 py-4 text-sm text-slate-500">
              배정된 학생이 없습니다.
            </li>
          ) : (
            enrollments?.map((e) => (
              <li key={e.student_id} className="px-4 py-3 text-sm">
                {unwrapRelation(e.student)?.name ?? "—"}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
