import { createClient } from "@/lib/supabase/server";
import { DashboardCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: courseCount },
    { count: classCount },
    { count: studentCount },
    { count: teacherCount },
    { count: enrollmentCount },
  ] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
  ]);

  const menuItems = [
    {
      href: "/admin/courses",
      title: "강좌 관리",
      description: "강좌·영상 등록, Vimeo 연결, 담당 강사 및 공개 설정",
      stat: courseCount ?? 0,
      statLabel: "등록 강좌",
      icon: <BookIcon />,
    },
    {
      href: "/admin/classes",
      title: "반 관리",
      description: "반 생성, 학생·강좌 일괄 배정",
      stat: classCount ?? 0,
      statLabel: "등록 반",
      icon: <UsersIcon />,
    },
    {
      href: "/admin/students",
      title: "학생·수강",
      description: "학생 계정 등록 및 강좌 수강 배정",
      stat: studentCount ?? 0,
      statLabel: "등록 학생",
      icon: <StudentIcon />,
    },
    {
      href: "/admin/progress",
      title: "수강 현황",
      description: "학생별·강좌별 시청률과 학습 일시 확인",
      stat: enrollmentCount ?? 0,
      statLabel: "수강 배정",
      icon: <ChartIcon />,
    },
    {
      href: "/admin/teachers",
      title: "강사 관리",
      description: "강사 계정·비밀번호·활성 상태 관리",
      stat: teacherCount ?? 0,
      statLabel: "등록 강사",
      icon: <TeacherIcon />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="관리 홈"
        description="강좌·반·학생·강사·수강 현황을 한곳에서 관리합니다."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <DashboardCard key={item.href} {...item} />
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-800">운영 요약</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">강좌</dt>
            <dd className="mt-0.5 text-lg font-semibold text-brand-700">
              {courseCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">학생</dt>
            <dd className="mt-0.5 text-lg font-semibold text-brand-700">
              {studentCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">강사</dt>
            <dd className="mt-0.5 text-lg font-semibold text-brand-700">
              {teacherCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">수강 배정</dt>
            <dd className="mt-0.5 text-lg font-semibold text-brand-700">
              {enrollmentCount ?? 0}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function BookIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
