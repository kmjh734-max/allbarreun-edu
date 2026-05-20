"use client";

import {
  AccountManagement,
  type TeacherCourseInfo,
} from "@/components/admin/AccountManagement";
import type { Profile } from "@/types/database";

interface TeacherManagementProps {
  teachers: Profile[];
  courseInfoByUserId: Record<string, TeacherCourseInfo>;
}

export function TeacherManagement({
  teachers,
  courseInfoByUserId,
}: TeacherManagementProps) {
  return (
    <AccountManagement
      roleLabel="강사"
      apiBasePath="/api/admin/teachers"
      users={teachers}
      allowUsernameEdit={false}
      courseInfoByUserId={courseInfoByUserId}
    />
  );
}
