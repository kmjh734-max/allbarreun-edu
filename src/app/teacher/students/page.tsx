import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { AccountManagement } from "@/components/admin/AccountManagement";
import { TeacherEnrollmentForm } from "@/components/teacher/TeacherEnrollmentForm";
import { unwrapRelation } from "@/lib/progress/enrollment-progress";
import type { Course, Profile } from "@/types/database";

export default async function TeacherStudentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const teacherId = profile!.id;

  const [{ data: students }, { data: courses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("created_by", teacherId)
      .order("name"),
    supabase
      .from("courses")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("title"),
  ]);

  const studentList = (students ?? []) as Profile[];
  const courseList = (courses ?? []) as Course[];
  const courseIds = courseList.map((c) => c.id);

  const { data: enrollments } =
    courseIds.length > 0
      ? await supabase
          .from("enrollments")
          .select("id, student_id, course_id, created_at, course:courses(title)")
          .in("course_id", courseIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const studentNameById = new Map(studentList.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold">학생 관리</h2>
        <p className="mt-1 text-sm text-slate-600">
          본인이 등록한 학생 계정을 관리하고, 담당 강좌에 배정할 수 있습니다.
        </p>
      </div>

      <AccountManagement
        roleLabel="학생"
        apiBasePath="/api/teacher/students"
        users={studentList}
        allowUsernameEdit={false}
      />

      <section>
        <h3 className="mb-3 font-semibold">수강 배정</h3>
        <TeacherEnrollmentForm students={studentList} courses={courseList} />
      </section>

      <section>
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
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    배정 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                (enrollments ?? []).map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {studentNameById.get(e.student_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {unwrapRelation(e.course)?.title ?? "—"}
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
