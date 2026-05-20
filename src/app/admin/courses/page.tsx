import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublishedBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import type { Course, Profile } from "@/types/database";

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const [{ data: courses }, { data: lessonRows }] = await Promise.all([
    supabase
      .from("courses")
      .select("*, teacher:profiles!courses_teacher_id_fkey(id, name, email)")
      .order("created_at", { ascending: false }),
    supabase.from("lessons").select("course_id"),
  ]);

  const typedCourses = (courses ?? []) as (Course & {
    teacher: Profile | null;
  })[];

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
        description="강좌·영상·담당 강사·공개 상태를 관리합니다."
        action={
          <ButtonLink href="/admin/courses/new" variant="primary" size="sm">
            + 새 강좌
          </ButtonLink>
        }
      />

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>강좌명</th>
              <th>담당 강사</th>
              <th>공개 상태</th>
              <th className="text-center">영상 수</th>
              <th className="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {typedCourses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  등록된 강좌가 없습니다.
                </td>
              </tr>
            ) : (
              typedCourses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50/80">
                  <td className="font-medium text-slate-900">{course.title}</td>
                  <td>{course.teacher?.name ?? "미배정"}</td>
                  <td>
                    <PublishedBadge published={course.is_published} />
                  </td>
                  <td className="text-center font-medium text-slate-700">
                    {lessonCountByCourse.get(course.id) ?? 0}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      관리
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
