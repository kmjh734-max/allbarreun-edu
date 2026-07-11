"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteClass } from "@/app/admin/classes/actions";

interface DeleteClassButtonProps {
  classId: string;
  className: string;
  onDelete?: (classId: string) => Promise<{ ok: boolean; message: string }>;
  /** 삭제 후 이동할 경로 (기본: 반 목록) */
  redirectTo?: string;
  /** 목록용 compact 스타일 */
  compact?: boolean;
}

export function DeleteClassButton({
  classId,
  className,
  onDelete = deleteClass,
  redirectTo = "/admin/classes",
  compact = false,
}: DeleteClassButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `「${className}」 반을 삭제하시겠습니까?\n반에 속한 학생·강좌 배정 정보가 정리될 수 있습니다. 학생 계정은 유지됩니다.`
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await onDelete(classId);
    setLoading(false);

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={handleDelete}
        className="rounded-lg border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? "삭제 중..." : "삭제"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleDelete}
      className="rounded-lg border border-red-400 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
    >
      {loading ? "삭제 중..." : "반 삭제"}
    </button>
  );
}
