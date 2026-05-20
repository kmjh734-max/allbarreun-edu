import Link from "next/link";
import { PublishedBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import type { Course } from "@/types/database";

interface TeacherCourseListProps {
  courses: Course[];
  lessonCountByCourse: Map<string, number>;
}

export function TeacherCourseList({
  courses,
  lessonCountByCourse,
}: TeacherCourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="text-slate-600">등록된 강좌가 없습니다.</p>
        <p className="mt-1 text-sm text-slate-500">
          새 강좌를 만들거나 관리자에게 배정을 요청해 주세요.
        </p>
        <div className="mt-4">
          <ButtonLink href="/teacher/courses/new" variant="primary" size="sm">
            + 새 강좌
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {courses.map((course) => {
        const lessonCount = lessonCountByCourse.get(course.id) ?? 0;
        return (
          <li key={course.id}>
            <Link
              href={`/teacher/courses/${course.id}`}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-brand-200 hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900 group-hover:text-brand-800">
                  {course.title}
                </h3>
                <PublishedBadge published={course.is_published} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                영상 <span className="font-semibold text-brand-700">{lessonCount}</span>개
              </p>
              <span className="mt-4 text-sm font-medium text-brand-600 group-hover:underline">
                강좌 관리 →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
