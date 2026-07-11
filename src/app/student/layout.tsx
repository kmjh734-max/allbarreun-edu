import { redirect } from "next/navigation";
import { filterNavItems } from "@/lib/academy-features";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
  { href: "/student", label: "내 강의실" },
  { href: "/student/courses", label: "수강 강좌" },
  { href: "/student/vocab", label: "단어학습" },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
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
