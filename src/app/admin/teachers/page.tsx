import { createClient } from "@/lib/supabase/server";
import { TeacherManagement } from "@/components/admin/TeacherManagement";
import type { TeacherCourseInfo } from "@/components/admin/AccountManagement";
import type { Course, Profile } from "@/types/database";

export default async function AdminTeachersPage() {
  const supabase = await createClient();

  const [{ data: teachers }, { data: courses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("name"),
    supabase
      .from("courses")
      .select("id, title, teacher_id")
      .not("teacher_id", "is", null),
  ]);

  const teacherList = (teachers ?? []) as Profile[];
  const courseInfoByUserId: Record<string, TeacherCourseInfo> = {};

  for (const course of (courses ?? []) as Pick<Course, "id" | "title" | "teacher_id">[]) {
    if (!course.teacher_id) continue;
    const existing = courseInfoByUserId[course.teacher_id] ?? {
      count: 0,
      titles: [],
    };
    existing.count += 1;
    if (existing.titles.length < 3) {
      existing.titles.push(course.title);
    }
    courseInfoByUserId[course.teacher_id] = existing;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">강사 관리</h2>
        <p className="mt-1 text-sm text-slate-600">
          강사 계정을 등록·수정하고 비밀번호와 활성 상태를 관리합니다.
        </p>
      </div>

      <TeacherManagement
        teachers={teacherList}
        courseInfoByUserId={courseInfoByUserId}
      />
    </div>
  );
}
