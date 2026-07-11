"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import * as adminActions from "@/app/admin/vocab/actions";
import * as teacherActions from "@/app/teacher/vocab/actions";
import { VocabSetCreateLauncher } from "@/components/vocab/VocabSetCreateLauncher";
import type { VocabSidebarSet } from "@/components/vocab/vocab-sidebar-types";
import { useVocabSidebar } from "@/components/vocab/VocabSidebarContext";
import type { Profile } from "@/types/database";

interface VocabSetsOverviewProps {
  role: "admin" | "teacher";
  classesHref: string;
  teachers?: Profile[];
}

export function VocabSetsOverview({
  role,
  classesHref,
  teachers,
}: VocabSetsOverviewProps) {
  const router = useRouter();
  const { folders, sets } = useVocabSidebar();
  const pathname = usePathname();
  const base = role === "admin" ? "/admin/vocab" : "/teacher/vocab";
  const basePath = base as "/admin/vocab" | "/teacher/vocab";
  const isSetsRoot = pathname === `${base}/sets`;

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  if (!isSetsRoot) return null;

  const actions = role === "admin" ? adminActions : teacherActions;
  const unfiled = sets.filter((s) => !s.folder_id);
  const setsByFolder = new Map<string, VocabSidebarSet[]>();
  for (const s of sets) {
    if (!s.folder_id) continue;
    const list = setsByFolder.get(s.folder_id) ?? [];
    list.push(s);
    setsByFolder.set(s.folder_id, list);
  }

  async function handleCreateFolder() {
    const trimmed = folderName.trim();
    if (!trimmed) {
      setFolderError("폴더 이름을 입력해 주세요.");
      return;
    }
    setCreatingFolder(true);
    setFolderError(null);
    const result = await actions.createVocabFolder(trimmed);
    setCreatingFolder(false);
    if (!result.ok) {
      setFolderError(result.message);
      return;
    }
    setFolderName("");
    setFolderModalOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">단어세트 만들기</h1>
          <p className="mt-2 text-slate-600">
            폴더 없이도 세트를 만들 수 있습니다. 필요하면 폴더로 묶어 관리하세요.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFolderError(null);
              setFolderModalOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-emerald-600 bg-white px-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            + 폴더 만들기
          </button>
          <VocabSetCreateLauncher
            role={role}
            folders={folders}
            teachers={teachers}
            basePath={basePath}
            label="+ 세트 만들기"
            onCreate={actions.createVocabSet}
          />
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">나의 폴더</h2>
          <Link
            href={classesHref}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            반 관리
          </Link>
        </div>
        {folders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
            폴더가 없습니다. 위의 「폴더 만들기」로 첫 폴더를 만드세요.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => {
              const folderSets = setsByFolder.get(folder.id) ?? [];
              const cardCount = folderSets.reduce(
                (sum, s) => sum + s.item_count,
                0
              );
              return (
                <Link
                  key={folder.id}
                  href={`${base}/folder/${folder.id}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="bg-gradient-to-r from-[#8fd14f] to-[#7cb518] px-4 py-3">
                    <span className="text-2xl" aria-hidden>
                      📁
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-slate-900 group-hover:text-brand-600">
                      {folder.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      세트 {folderSets.length}개 · {cardCount} 카드
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {unfiled.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="font-semibold text-amber-900">
            폴더 없는 단어세트 ({unfiled.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {unfiled.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${base}/set/${s.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {s.title} ({s.item_count} 카드)
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {folderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">폴더 만들기</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  폴더 이름
                </label>
                <input
                  className="ui-input w-full"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="예: 능률보카 입문"
                  disabled={creatingFolder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateFolder();
                  }}
                  autoFocus
                />
              </div>
              {folderError && (
                <p className="text-sm text-red-600" role="alert">
                  {folderError}
                </p>
              )}
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setFolderModalOpen(false);
                  setFolderName("");
                  setFolderError(null);
                }}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={creatingFolder}
                onClick={() => void handleCreateFolder()}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creatingFolder ? "만드는 중…" : "만들기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
