import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { AccountManagement } from "@/components/admin/AccountManagement";
import { EnrollmentList } from "@/components/admin/EnrollmentList";
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
        showListSearch
        listSearchPlaceholder="학생 이름·아이디 검색"
      />

      <section>
        <h3 className="mb-3 font-semibold">수강 배정</h3>
        <TeacherEnrollmentForm students={studentList} courses={courseList} />
      </section>

      <section>
        <h3 className="mb-3 font-semibold">배정 내역</h3>
        <EnrollmentList
          variant="teacher"
          rows={(enrollments ?? []).map((e) => ({
            id: e.id,
            studentName: studentNameById.get(e.student_id) ?? "—",
            courseTitle: unwrapRelation(e.course)?.title ?? "—",
            createdAt: e.created_at,
          }))}
        />
      </section>
    </div>
  );
}
