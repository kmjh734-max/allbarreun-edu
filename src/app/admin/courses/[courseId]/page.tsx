import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { resolveLessonTeacherId } from "@/lib/courses/resolve-lesson-teacher-id";
import { flattenCourseLessons } from "@/lib/courses/course-lessons";
import { CourseSettingsForm } from "@/components/courses/CourseSettingsForm";
import { CourseStudentVisibilityBanner } from "@/components/courses/CourseStudentVisibilityBanner";
import { CourseVideoManager } from "@/components/courses/CourseVideoManager";
import type { Course, Lesson, Profile, Section } from "@/types/database";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function AdminCourseDetailPage({ params }: PageProps) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [
    { data: course },
    { data: teachers },
    { data: sections },
    { data: lessons, error: lessonsError },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .eq("is_active", true)
      .order("name"),
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
      .select("*, student:profiles!enrollments_student_id_fkey(name, email)")
      .eq("course_id", courseId),
  ]);

  if (!course) notFound();

  const typedCourse = course as Course;
  const teacherList = (teachers ?? []) as Profile[];
  const sectionList = (sections ?? []) as Section[];
  const lessonList = (lessons ?? []) as Lesson[];
  const flatLessons = flattenCourseLessons(sectionList, lessonList);
  const lessonTeacherId = resolveLessonTeacherId(
    typedCourse.teacher_id,
    profile!.id
  );

  const assignedTeacher = teacherList.find((t) => t.id === typedCourse.teacher_id);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin/courses"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 강좌 목록
        </Link>
        <h2 className="mt-2 text-xl font-semibold">강좌 관리</h2>
        <p className="text-sm text-slate-600">강좌명: {typedCourse.title}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">강좌 기본 정보</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">강좌명</dt>
            <dd className="font-medium">{typedCourse.title}</dd>
          </div>
          <div>
            <dt className="text-slate-500">담당 강사</dt>
            <dd className="font-medium">
              {assignedTeacher?.name ?? "미배정"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">공개 여부</dt>
            <dd>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  typedCourse.is_published
                    ? "bg-green-100 text-green-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {typedCourse.is_published ? "공개" : "비공개"}
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">설명</dt>
            <dd className="mt-1 text-slate-700">
              {typedCourse.description ?? "설명 없음"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">강좌 정보 수정</h3>
        <CourseSettingsForm
          variant="admin"
          course={typedCourse}
          teachers={teacherList}
          listHref="/admin/courses"
        />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
          teacherId={lessonTeacherId}
          lessons={flatLessons}
          apiVariant="admin"
        />
      </section>

      <section>
        <h3 className="mb-3 font-semibold">수강 학생</h3>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {(enrollments ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              배정된 학생이 없습니다.{" "}
              <Link
                href="/admin/students"
                className="text-brand-600 hover:underline"
              >
                학생 배정
              </Link>
              메뉴에서 추가하세요.
            </li>
          ) : (
            enrollments?.map((e) => {
              const student = e.student as { name: string; email: string } | null;
              return (
                <li key={e.id} className="px-4 py-3 text-sm">
                  {student?.name} — {student?.email}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
