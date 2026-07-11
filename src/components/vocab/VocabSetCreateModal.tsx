"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types/database";

interface VocabSetCreateModalProps {
  open: boolean;
  onClose: () => void;
  role: "admin" | "teacher";
  teachers?: Profile[];
  basePath: "/admin/vocab" | "/teacher/vocab";
  folderId?: string | null;
  folders?: { id: string; name: string }[];
  onCreate: (input: {
    title: string;
    description?: string;
    teacherId?: string;
    folderId?: string | null;
  }) => Promise<{ ok: boolean; message: string; setId?: string }>;
}

export function VocabSetCreateModal({
  open,
  onClose,
  role,
  teachers = [],
  basePath,
  folderId,
  folders = [],
  onCreate,
}: VocabSetCreateModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(
    folderId ?? folders[0]?.id ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsFolderPick = folderId === undefined || folderId === null;
  const effectiveFolderId = folderId ?? selectedFolderId;

  if (!open) return null;

  async function createAndGo(mode: "direct" | "import") {
    if (!title.trim()) {
      setError("세트명을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      teacherId: role === "admin" ? teacherId || undefined : undefined,
      folderId: effectiveFolderId || null,
    });

    setLoading(false);

    if (!result.ok || !result.setId) {
      setError(result.message);
      return;
    }

    const suffix = mode === "import" ? "?import=1" : "";
    router.push(`${basePath}/set/${result.setId}${suffix}`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="relative bg-[#b8e986] px-6 py-4 text-center">
          <h2 className="text-lg font-bold text-slate-900">단어세트 생성하기</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl leading-none text-slate-700 hover:text-slate-900"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <label className="w-20 shrink-0 text-sm font-semibold text-slate-800">
              세트명
            </label>
            <input
              className="ui-input flex-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="단어장 이름"
              disabled={loading}
            />
          </div>

          {needsFolderPick ? (
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <label className="w-20 shrink-0 text-sm font-semibold text-slate-800">
                폴더
              </label>
              <select
                className="ui-select flex-1"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                disabled={loading}
              >
                <option value="">미분류 (폴더 없음)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <label className="w-20 shrink-0 text-sm font-semibold text-slate-800">
              설명
            </label>
            <input
              className="ui-input flex-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명이 있다면 입력하세요 (선택)"
              disabled={loading}
            />
          </div>

          {role === "admin" && (
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <label className="w-20 shrink-0 text-sm font-semibold text-slate-800">
                담당 강사
              </label>
              <select
                className="ui-select flex-1"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={loading}
              >
                <option value="">미지정</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">언어</label>
              <select
                className="rounded-md border-2 border-violet-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-800"
                defaultValue="en"
                disabled
              >
                <option value="en">English (예문 AI 자동생성)</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              폴더 없이도 세트를 만들 수 있습니다. 학생별 배정은 반 관리에서 하세요.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-0 border-t border-slate-200">
          <button
            type="button"
            disabled={loading}
            onClick={() => createAndGo("direct")}
            className="border-r border-slate-200 bg-white py-4 text-base font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            직접 입력
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => createAndGo("import")}
            className="bg-[#7cb518] py-4 text-base font-bold text-white transition hover:bg-[#6aa014] disabled:opacity-50"
          >
            {loading ? "생성 중..." : "자료 가져오기"}
          </button>
        </div>
      </div>
    </div>
  );
}
