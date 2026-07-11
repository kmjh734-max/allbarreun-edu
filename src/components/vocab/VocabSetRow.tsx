"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as adminActions from "@/app/admin/vocab/actions";
import * as teacherActions from "@/app/teacher/vocab/actions";

export interface VocabSetRowData {
  id: string;
  title: string;
  itemCount: number;
  teacherName: string | null;
}

interface FolderOption {
  id: string;
  name: string;
}

interface VocabSetRowProps {
  role: "admin" | "teacher";
  set: VocabSetRowData;
  folderId: string;
  basePath: string;
  folders: FolderOption[];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onAssignSet: () => void;
  isDragging?: boolean;
  onDragHandleStart?: (e: React.DragEvent) => void;
  onDragHandleEnd?: () => void;
}

export function VocabSetRow({
  role,
  set,
  folderId,
  basePath,
  folders,
  checked,
  onCheckedChange,
  onAssignSet,
  isDragging = false,
  onDragHandleStart,
  onDragHandleEnd,
}: VocabSetRowProps) {
  const router = useRouter();
  const actions = role === "admin" ? adminActions : teacherActions;
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"move" | "copy" | null>(null);
  const [targetFolder, setTargetFolder] = useState(folderId);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `「${set.title}」 단어장을 삭제하시겠습니까?\n학생 학습 기록이 함께 삭제될 수 있습니다.`
      )
    ) {
      return;
    }
    setLoading(true);
    const result = await actions.deleteVocabSet(set.id, folderId);
    setLoading(false);
    window.alert(result.message);
    if (result.ok) router.refresh();
  }

  async function handleMove() {
    if (!targetFolder) return;
    setLoading(true);
    const result = await actions.moveVocabSet(set.id, targetFolder);
    setLoading(false);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setDialog(null);
    router.push(`${basePath}/folder/${targetFolder}`);
    router.refresh();
  }

  async function handleCopy() {
    if (!targetFolder) return;
    setLoading(true);
    const result = await actions.copyVocabSet(set.id, targetFolder);
    setLoading(false);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setDialog(null);
    if (result.setId) {
      router.push(`${basePath}/set/${result.setId}`);
    } else {
      router.refresh();
    }
  }

  return (
    <div
      className={`group flex items-center gap-3 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-slate-50/80 ${
        checked ? "bg-violet-50/50" : "bg-white"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        draggable={!!onDragHandleStart}
        onDragStart={onDragHandleStart}
        onDragEnd={onDragHandleEnd}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
        title="드래그하여 순서 변경"
        aria-label={`${set.title} 순서 변경`}
      >
        ≡
      </button>

      <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
        단어
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`${basePath}/set/${set.id}`}
          className="text-base font-semibold text-slate-900 hover:text-brand-600 hover:underline"
        >
          {set.title}
        </Link>
        <p className="mt-0.5 text-sm text-slate-500">
          {set.itemCount} 카드
          {set.teacherName ? ` · ${set.teacherName}` : ""}
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          관리 ▾
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              aria-label="메뉴 닫기"
              onClick={() => setMenuOpen(false)}
            />
            <ul className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <li>
                <Link
                  href={`${basePath}/set/${set.id}`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  단어 입력
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onAssignSet();
                  }}
                >
                  학생/반 배정
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setDialog("move");
                    setTargetFolder(folderId);
                  }}
                >
                  폴더 이동
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setDialog("copy");
                    setTargetFolder(folders[0]?.id ?? folderId);
                  }}
                >
                  복사
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={loading}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    handleDelete();
                  }}
                >
                  삭제
                </button>
              </li>
            </ul>
          </>
        )}
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        aria-label={`${set.title} 선택`}
      />

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="font-semibold text-slate-900">
              {dialog === "move" ? "폴더로 이동" : "폴더에 복사"}
            </p>
            <p className="mt-1 text-sm text-slate-600">{set.title}</p>
            <select
              className="ui-select mt-4 w-full"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={dialog === "move" ? handleMove : handleCopy}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "처리 중…" : dialog === "move" ? "이동" : "복사"}
              </button>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
