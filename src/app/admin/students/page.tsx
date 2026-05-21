import { createClient } from "@/lib/supabase/server";
import { EnrollmentForm } from "@/components/admin/EnrollmentForm";
import { EnrollmentList } from "@/components/admin/EnrollmentList";
import { StudentManagement } from "@/components/admin/StudentManagement";
import {
  buildCoursePickerTree,
  buildStudentPickerTree,
} from "@/lib/ui/build-enrollment-trees";
import {
  parseClassStudentLinks,
} from "@/lib/ui/parse-class-links";
import type { Course, Profile } from "@/types/database";

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const [
    { data: students },
    { data: courses },
    { data: enrollments },
    { data: classStudents },
  ] = await Promise.all([
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
    supabase
      .from("class_students")
      .select("student_id, class_id, class:classes(id, name)"),
  ]);

  const studentList = (students ?? []) as Profile[];
  const activeStudents = studentList.filter((s) => s.is_active !== false);
  const courseList = (courses ?? []) as Course[];
  const studentClassLinks = parseClassStudentLinks(classStudents);
  const studentTree = buildStudentPickerTree(studentList, studentClassLinks);
  const courseTree = buildCoursePickerTree(courseList);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold">학생 · 수강 관리</h2>
        <p className="mt-1 text-sm text-slate-600">
          학생 계정을 등록·수정하고, 강좌 배정 및 수강 현황을 관리합니다.
        </p>
      </div>

      <section id="students" className="scroll-mt-8">
        <StudentManagement students={studentList} studentTree={studentTree} />
      </section>

      <section id="assign" className="scroll-mt-8">
        <h3 className="mb-3 font-semibold">수강 배정</h3>
        <EnrollmentForm
          studentTree={buildStudentPickerTree(activeStudents, studentClassLinks)}
          courseTree={buildCoursePickerTree(courseList)}
        />
      </section>

      <section id="enrollment-status" className="scroll-mt-8">
        <h3 className="mb-3 font-semibold">배정 내역</h3>
        <EnrollmentList
          variant="admin"
          rows={(enrollments ?? []).map((e) => ({
            id: e.id,
            studentName:
              (e.student as { name: string } | null)?.name ?? "—",
            courseTitle:
              (e.course as { title: string } | null)?.title ?? "—",
            createdAt: e.created_at,
          }))}
        />
      </section>
    </div>
  );
}
