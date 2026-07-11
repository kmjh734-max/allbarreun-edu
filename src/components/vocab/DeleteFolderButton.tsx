"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteFolderButtonProps {
  folderId: string;
  folderName: string;
  basePath: string;
  onDelete: (folderId: string) => Promise<{ ok: boolean; message: string }>;
}

export function DeleteFolderButton({
  folderId,
  folderName,
  basePath,
  onDelete,
}: DeleteFolderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (
      !window.confirm(
        `「${folderName}」 폴더를 삭제하시겠습니까?\n폴더 안 단어장은 삭제되지 않고 폴더 없음으로 이동됩니다.`
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await onDelete(folderId);
    setLoading(false);

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    router.push(basePath);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleDelete}
      title="폴더 삭제"
      className="shrink-0 rounded px-1.5 py-1 text-[10px] font-bold leading-none text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "…" : "삭제"}
    </button>
  );
}
