"use client";

import { AccountManagement } from "@/components/admin/AccountManagement";
import type { TreeNode } from "@/lib/ui/tree-types";
import type { Profile } from "@/types/database";

interface StudentManagementProps {
  students: Profile[];
  studentTree: TreeNode[];
}

export function StudentManagement({
  students,
  studentTree,
}: StudentManagementProps) {
  return (
    <AccountManagement
      roleLabel="학생"
      apiBasePath="/api/admin/students"
      users={students}
      allowUsernameEdit
      allowDelete={true}
      showListSearch
      listSearchPlaceholder="학생 이름·아이디 검색"
      listFilterTree={studentTree}
      listFilterLabel="반·학생으로 찾기"
    />
  );
}
