"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as adminActions from "@/app/admin/vocab/actions";
import * as teacherActions from "@/app/teacher/vocab/actions";

interface FolderHeaderProps {
  role: "admin" | "teacher";
  folderId: string;
  folderName: string;
  basePath: string;
  academyName: string;
  ownerName: string;
  ownerUsername: string | null;
  setCount: number;
  onAssignClick: () => void;
  createSetButton: React.ReactNode;
}

export function FolderHeader({
  role,
  folderId,
  folderName,
  basePath,
  academyName,
  ownerName,
  ownerUsername,
  setCount,
  onAssignClick,
  createSetButton,
}: FolderHeaderProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folderName);
  const [saving, setSaving] = useState(false);
  const ownerLabel = ownerUsername
    ? `${academyName}, ${ownerUsername} 님의 폴더입니다`
    : `${academyName}, ${ownerName} 님의 폴더입니다`;

  useEffect(() => {
    setName(folderName);
  }, [folderName]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folderName) {
      setEditing(false);
      setName(folderName);
      return;
    }
    setSaving(true);
    const actions = role === "admin" ? adminActions : teacherActions;
    const result = await actions.updateVocabFolder(folderId, trimmed);
    setSaving(false);
    if (!result.ok) {
      window.alert(result.message);
      setName(folderName);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <header className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-[#8fd14f] via-[#7cb518] to-[#6aa014] shadow-md">
      <div
        className="relative px-5 py-6 sm:px-8 sm:py-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-4 h-32 w-32 opacity-20"
          aria-hidden
        >
          <svg viewBox="0 0 64 64" className="h-full w-full text-white">
            <path
              fill="currentColor"
              d="M8 12h40v40H8V12zm4 4v32h32V16H12zm6 6h20v4H18v-4zm0 8h20v4H18v-4zm0 8h14v4H18v-4z"
            />
          </svg>
        </div>

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm sm:h-20 sm:w-20">
              <span className="text-4xl sm:text-5xl" aria-hidden>
                📁
              </span>
            </div>
            <div className="min-w-0 text-white">
              {editing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-[12rem] rounded-lg border-0 px-3 py-2 text-lg font-bold text-slate-900 shadow-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") {
                        setEditing(false);
                        setName(folderName);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveName}
                    className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-white"
                  >
                    {saving ? "저장 중…" : "저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setName(folderName);
                    }}
                    className="text-sm text-white/90 underline"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold leading-tight sm:text-2xl">
                    {folderName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    title="폴더명 수정"
                    className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30"
                    aria-label="폴더명 수정"
                  >
                    <PencilIcon />
                  </button>
                </div>
              )}
              <p className="mt-1 text-sm text-white/90">{ownerLabel}</p>
              <p className="mt-2 text-sm font-medium text-white/80">
                단어세트 {setCount}개 · 드래그로 순서 변경
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAssignClick}
              className="inline-flex h-10 items-center rounded-lg border-2 border-white/80 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              학생·반 배정
            </button>
            {createSetButton}
          </div>
        </div>
      </div>
    </header>
  );
}

function PencilIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}
