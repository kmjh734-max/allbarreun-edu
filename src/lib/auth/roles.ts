import type { UserRole } from "@/types/database";

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATH[role];
}

export function isRolePathAllowed(
  role: UserRole,
  pathname: string
): boolean {
  const prefix = ROLE_DASHBOARD_PATH[role];
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
