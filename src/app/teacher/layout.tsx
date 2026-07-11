import { redirect } from "next/navigation";
import { filterNavItems } from "@/lib/academy-features";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
  { href: "/teacher", label: "강사 홈" },
  { href: "/teacher/courses", label: "강좌 관리" },
  { href: "/teacher/vocab", label: "단어학습" },
  { href: "/teacher/question-generator", label: "변형문제" },
  { href: "/teacher/classes", label: "반 관리" },
  { href: "/teacher/students", label: "학생 관리" },
  { href: "/teacher/progress", label: "수강 현황" },
  { href: "/teacher/student-records", label: "학생부 분석" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "teacher") {
    redirect("/login");
  }

  if (profile.is_active === false) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?inactive=1");
  }

  return (
    <DashboardLayout profile={profile} navItems={filterNavItems(NAV_ITEMS)}>
      {children}
    </DashboardLayout>
  );
}
