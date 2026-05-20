import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { ActiveBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Class } from "@/types/database";

export default async function TeacherClassesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", profile!.id)
    .order("created_at", { ascending: false });

  const classList = (classes ?? []) as Class[];
  const classIds = classList.map((c) => c.id);

  const [{ data: studentRows }, { data: courseRows }] =
    classIds.length > 0
      ? await Promise.all([
          supabase
            .from("class_students")
            .select("class_id")
            .in("class_id", classIds),
          supabase
            .from("class_courses")
            .select("class_id")
            .in("class_id", classIds),
        ])
      : [{ data: [] }, { data: [] }];

  const studentCountByClass = new Map<string, number>();
  for (const row of studentRows ?? []) {
    studentCountByClass.set(
      row.class_id,
      (studentCountByClass.get(row.class_id) ?? 0) + 1
    );
  }

  const courseCountByClass = new Map<string, number>();
  for (const row of courseRows ?? []) {
    courseCountByClass.set(
      row.class_id,
      (courseCountByClass.get(row.class_id) ?? 0) + 1
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="반 관리"
        description="담당 반의 학생·강좌를 관리합니다. 강좌 배정 시 반 학생 전원에게 수강이 등록됩니다."
      />

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">반 이름</th>
              <th className="px-4 py-3 font-medium">학생</th>
              <th className="px-4 py-3 font-medium">강좌</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {classList.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  담당 반이 없습니다. 관리자에게 반 배정을 요청해 주세요.
                </td>
              </tr>
            ) : (
              classList.map((cls) => (
                <tr
                  key={cls.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{cls.name}</td>
                  <td className="px-4 py-3">
                    {studentCountByClass.get(cls.id) ?? 0}명
                  </td>
                  <td className="px-4 py-3">
                    {courseCountByClass.get(cls.id) ?? 0}개
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={cls.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/teacher/classes/${cls.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      반 관리
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
