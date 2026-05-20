import { AppHeader, type AppNavItem } from "@/components/layout/AppHeader";
import type { Profile } from "@/types/database";

interface DashboardLayoutProps {
  profile: Profile;
  navItems: AppNavItem[];
  children: React.ReactNode;
}

export function DashboardLayout({
  profile,
  navItems,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} items={navItems} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
