"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FolderOption {
  id: string;
  name: string;
}

interface VocabSetFolderActionsProps {
  setId: string;
  setTitle: string;
  currentFolderId: string | null;
  folders: FolderOption[];
  basePath: string;
  assignHref: string;
  onMove: (
    setId: string,
    folderId: string | null
  ) => Promise<{ ok: boolean; message: string }>;
  onCopy: (
    setId: string,
    folderId: string
  ) => Promise<{ ok: boolean; message: string; setId?: string }>;
}

export function VocabSetFolderActions({
  setId,
  setTitle,
  currentFolderId,
  folders,
  basePath,
  assignHref,
  onMove,
  onCopy,
}: VocabSetFolderActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"move" | "copy" | null>(null);
  const [targetFolder, setTargetFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleMove() {
    if (!targetFolder) {
      setMessage("이동할 폴더를 선택해 주세요.");
      return;
    }
    setLoading(true);
    const result = await onMove(setId, targetFolder);
    setMessage(result.message);
    setLoading(false);
    if (result.ok) {
      setOpen(null);
      router.push(`${basePath}/folder/${targetFolder}`);
      router.refresh();
    }
  }

  async function handleCopy() {
    if (!targetFolder) {
      setMessage("복사할 폴더를 선택해 주세요.");
      return;
    }
    setLoading(true);
    const result = await onCopy(setId, targetFolder);
    setMessage(result.message);
    setLoading(false);
    if (result.ok) {
      setOpen(null);
      if (result.setId) {
        router.push(`${basePath}/set/${result.setId}`);
      } else {
        router.refresh();
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`${basePath}/set/${setId}`}
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        단어 입력
      </Link>
      <Link
        href={assignHref}
        className="text-sm font-medium text-violet-600 hover:underline"
      >
        배정
      </Link>
      <button
        type="button"
        className="text-sm font-medium text-slate-600 hover:underline"
        onClick={() => {
          setOpen("move");
          setTargetFolder(currentFolderId ?? folders[0]?.id ?? "");
          setMessage(null);
        }}
      >
        폴더 이동
      </button>
      <button
        type="button"
        className="text-sm font-medium text-slate-600 hover:underline"
        onClick={() => {
          setOpen("copy");
          setTargetFolder(folders[0]?.id ?? "");
          setMessage(null);
        }}
      >
        복사
      </button>

      {open && (
        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">
            {open === "move" ? `「${setTitle}」 이동` : `「${setTitle}」 복사`}
          </p>
          <select
            className="ui-select mt-2 w-full"
            value={targetFolder}
            onChange={(e) => setTargetFolder(e.target.value)}
          >
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={loading}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              onClick={open === "move" ? handleMove : handleCopy}
            >
              {loading ? "처리 중..." : open === "move" ? "이동" : "복사"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              onClick={() => setOpen(null)}
            >
              취소
            </button>
          </div>
          {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
        </div>
      )}
    </div>
  );
}
