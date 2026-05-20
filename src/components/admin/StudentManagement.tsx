"use client";

import { AccountManagement } from "@/components/admin/AccountManagement";
import type { Profile } from "@/types/database";

interface StudentManagementProps {
  students: Profile[];
}

export function StudentManagement({ students }: StudentManagementProps) {
  return (
    <AccountManagement
      roleLabel="학생"
      apiBasePath="/api/admin/students"
      users={students}
      allowUsernameEdit
    />
  );
}
