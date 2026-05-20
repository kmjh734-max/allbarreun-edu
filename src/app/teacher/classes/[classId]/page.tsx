import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  ClassCoursesPanel,
  ClassInfoPanel,
  ClassStudentsPanel,
} from "@/components/classes/ClassDetailPanels";
import { unwrapRelation } from "@/lib/progress/enrollment-progress";
import type { Class, Course, Profile } from "@/types/database";

interface PageProps {
  params: Promise<{ classId: string }>;
}

export default async function TeacherClassDetailPage({ params }: PageProps) {
  const { classId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: classRow } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("teacher_id", profile!.id)
    .single();

  if (!classRow) notFound();

  const typedClass = classRow as Class;

  const [
    { data: myStudents },
    { data: myCourses },
    { data: members },
    { data: classCourses },
    { data: teachers },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("created_by", profile!.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("courses")
      .select("*")
      .eq("teacher_id", profile!.id)
      .order("title"),
    supabase
      .from("class_students")
      .select("id, student_id, student:profiles!class_students_student_id_fkey(name, username)")
      .eq("class_id", classId)
      .order("created_at"),
    supabase
      .from("class_courses")
      .select("id, course_id, course:courses(title)")
      .eq("class_id", classId)
      .order("created_at"),
    typedClass.teacher_id
      ? supabase
          .from("profiles")
          .select("*")
          .eq("id", typedClass.teacher_id)
      : { data: [] },
  ]);

  const memberList = (members ?? []).map((m) => {
    const student = unwrapRelation(m.student);
    return {
      id: m.id as string,
      student_id: m.student_id as string,
      name: student?.name ?? "—",
      username: student?.username ?? null,
    };
  });

  const courseList = (classCourses ?? []).map((cc) => {
    const course = unwrapRelation(cc.course);
    return {
      id: cc.id as string,
      course_id: cc.course_id as string,
      title: course?.title ?? "—",
    };
  });

  const teacherList = (teachers ?? []) as Profile[];

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/teacher/classes"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 반 목록
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{typedClass.name}</h2>
        {typedClass.description && (
          <p className="mt-1 text-sm text-slate-600">{typedClass.description}</p>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">반 정보</h3>
        <ClassInfoPanel
          variant="teacher"
          classId={classId}
          initialName={typedClass.name}
          initialDescription={typedClass.description ?? ""}
          initialTeacherId={typedClass.teacher_id ?? ""}
          initialIsActive={typedClass.is_active}
          teachers={teacherList}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">학생 관리</h3>
        <p className="mb-3 text-sm text-slate-600">
          본인이 등록한 학생만 반에 추가할 수 있습니다.
        </p>
        <ClassStudentsPanel
          variant="teacher"
          classId={classId}
          members={memberList}
          studentOptions={(myStudents ?? []) as Profile[]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">강좌 일괄 배정</h3>
        <p className="mb-3 text-sm text-slate-600">
          본인이 담당하는 강좌만 반에 배정할 수 있습니다.
        </p>
        <ClassCoursesPanel
          variant="teacher"
          classId={classId}
          classCourses={courseList}
          courseOptions={(myCourses ?? []) as Course[]}
        />
      </section>
    </div>
  );
}
