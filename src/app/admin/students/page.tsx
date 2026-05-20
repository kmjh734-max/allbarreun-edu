import { createClient } from "@/lib/supabase/server";
import { EnrollmentForm } from "@/components/admin/EnrollmentForm";
import { StudentManagement } from "@/components/admin/StudentManagement";
import type { Course, Profile } from "@/types/database";

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: courses }, { data: enrollments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("name"),
      supabase.from("courses").select("*").order("title"),
      supabase
        .from("enrollments")
        .select("*, student:profiles!enrollments_student_id_fkey(name), course:courses(title)")
        .order("created_at", { ascending: false }),
    ]);

  const studentList = (students ?? []) as Profile[];
  const activeStudents = studentList.filter((s) => s.is_active !== false);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold">학생 · 수강 관리</h2>
        <p className="mt-1 text-sm text-slate-600">
          학생 계정을 등록·수정하고, 강좌 배정 및 수강 현황을 관리합니다.
        </p>
      </div>

      <section id="students" className="scroll-mt-8">
        <StudentManagement students={studentList} />
      </section>

      <section id="assign" className="scroll-mt-8">
        <h3 className="mb-3 font-semibold">수강 배정</h3>
        <EnrollmentForm
          students={activeStudents}
          courses={(courses ?? []) as Course[]}
        />
      </section>

      <section id="enrollment-status" className="scroll-mt-8">
        <h3 className="mb-3 font-semibold">배정 내역</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3">학생</th>
                <th className="px-4 py-3">강좌</th>
                <th className="px-4 py-3">배정일</th>
              </tr>
            </thead>
            <tbody>
              {(enrollments ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    배정 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                enrollments?.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      {(e.student as { name: string } | null)?.name}
                    </td>
                    <td className="px-4 py-3">
                      {(e.course as { title: string } | null)?.title}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(e.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
