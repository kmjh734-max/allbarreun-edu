"use client";

import { AccountManagement } from "@/components/admin/AccountManagement";
import type { Profile } from "@/types/database";

interface AdminManagementProps {
  admins: Profile[];
}

export function AdminManagement({ admins }: AdminManagementProps) {
  return (
    <AccountManagement
      roleLabel="관리자"
      apiBasePath="/api/admin/admins"
      users={admins}
      allowUsernameEdit
      allowDelete
    />
  );
}
