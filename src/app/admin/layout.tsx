import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
  { href: "/admin", label: "관리 홈" },
  { href: "/admin/courses", label: "강좌 관리" },
  { href: "/admin/classes", label: "반 관리" },
  { href: "/admin/students", label: "학생·수강" },
  { href: "/admin/progress", label: "수강 현황" },
  { href: "/admin/student-records", label: "학생부 분석" },
  { href: "/admin/teachers", label: "강사 관리" },
  { href: "/admin/admins", label: "관리자 계정" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/login");
  }

  return (
    <DashboardLayout profile={profile} navItems={NAV_ITEMS}>
      {children}
    </DashboardLayout>
  );
}
