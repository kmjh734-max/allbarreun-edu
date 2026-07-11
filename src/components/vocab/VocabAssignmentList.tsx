"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { VocabAssignment } from "@/types/database";

interface VocabAssignmentListProps {
  setId: string;
  assignments: VocabAssignment[];
  onRemove: (
    assignmentId: string,
    setId: string
  ) => Promise<{ ok: boolean; message: string }>;
}

export function VocabAssignmentList({
  setId,
  assignments,
  onRemove,
}: VocabAssignmentListProps) {
  const router = useRouter();

  async function handleRemove(assignmentId: string) {
    if (!confirm("이 배정을 해제할까요?")) return;
    const result = await onRemove(assignmentId, setId);
    if (result.ok) router.refresh();
    else alert(result.message);
  }

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-slate-500">아직 배정된 학생·반이 없습니다.</p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {assignments.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span>
            {a.student_id
              ? `학생: ${(a.student as { name: string } | null)?.name ?? a.student_id}`
              : `반: ${(a.class as { name: string } | null)?.name ?? a.class_id}`}
          </span>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => handleRemove(a.id)}
          >
            해제
          </Button>
        </li>
      ))}
    </ul>
  );
}
