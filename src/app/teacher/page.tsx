import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function TeacherDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id")
    .eq("teacher_id", profile!.id);

  const courseIds = (courses ?? []).map((c) => c.id);

  const [{ count: enrollmentCount }, { count: myStudentCount }, { count: myClassCount }] =
    await Promise.all([
      courseIds.length > 0
        ? supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student")
        .eq("created_by", profile!.id),
      supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", profile!.id),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="강사 홈"
        description="담당 강좌·반·학생·수강 현황을 관리합니다."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard
          href="/teacher/courses"
          title="내 강좌"
          description="강좌 정보 수정, 영상 등록·삭제, 강좌 삭제"
          stat={courseIds.length}
          statLabel="담당 강좌"
        />
        <DashboardCard
          href="/teacher/classes"
          title="반 관리"
          description="반 학생·강좌 일괄 배정"
          stat={myClassCount ?? 0}
          statLabel="담당 반"
        />
        <DashboardCard
          href="/teacher/students"
          title="학생 관리"
          description="학생 등록 및 강좌 배정"
          stat={myStudentCount ?? 0}
          statLabel="등록 학생"
        />
        <DashboardCard
          href="/teacher/progress"
          title="수강 현황"
          description="학생별 시청률·학습 일시 확인"
          stat={enrollmentCount ?? 0}
          statLabel="수강 배정"
        />
      </div>
    </div>
  );
}
