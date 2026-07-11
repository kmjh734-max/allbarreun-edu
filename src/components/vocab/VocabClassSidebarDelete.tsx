"use client";

import { DeleteClassButton } from "@/components/classes/DeleteClassButton";
import { deleteClass } from "@/app/admin/classes/actions";
import { teacherDeactivateClass } from "@/app/teacher/classes/actions";

interface VocabClassSidebarDeleteProps {
  role: "admin" | "teacher";
  classId: string;
  className: string;
}

export function VocabClassSidebarDelete({
  role,
  classId,
  className,
}: VocabClassSidebarDeleteProps) {
  const base = role === "admin" ? "/admin/vocab" : "/teacher/vocab";

  return (
    <DeleteClassButton
      classId={classId}
      className={className}
      onDelete={role === "admin" ? deleteClass : teacherDeactivateClass}
      redirectTo={base}
      compact
    />
  );
}
