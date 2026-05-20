import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export default async function AdminClassDetailPage({ params }: PageProps) {
  const { classId } = await params;
  const supabase = await createClient();

  const { data: classRow } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (!classRow) notFound();

  const typedClass = classRow as Class;

  const [
    { data: teachers },
    { data: students },
    { data: courses },
    { data: members },
    { data: classCourses },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("is_active", true)
      .order("name"),
    supabase.from("courses").select("*").order("title"),
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

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin/classes"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 반 목록
        </Link>
        <h2 className="mt-2 text-xl font-semibold">반 관리</h2>
        <p className="text-sm text-slate-600">{typedClass.name}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">반 기본 정보</h3>
        <ClassInfoPanel
          variant="admin"
          classId={classId}
          initialName={typedClass.name}
          initialDescription={typedClass.description ?? ""}
          initialTeacherId={typedClass.teacher_id ?? ""}
          initialIsActive={typedClass.is_active}
          teachers={(teachers ?? []) as Profile[]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">학생 관리</h3>
        <ClassStudentsPanel
          variant="admin"
          classId={classId}
          members={memberList}
          studentOptions={(students ?? []) as Profile[]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">강좌 일괄 배정</h3>
        <ClassCoursesPanel
          variant="admin"
          classId={classId}
          classCourses={courseList}
          courseOptions={(courses ?? []) as Course[]}
        />
      </section>
    </div>
  );
}
