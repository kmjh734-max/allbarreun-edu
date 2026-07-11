"use client";

import Link from "next/link";
import type {
  VocabAssignFolderItem,
  VocabAssignSetItem,
} from "@/lib/vocab/load-assign-hub";

interface VocabAssignHubProps {
  role: "admin" | "teacher";
  folders: VocabAssignFolderItem[];
  unfiledSets: VocabAssignSetItem[];
}

export function VocabAssignHub({
  role,
  folders,
  unfiledSets,
}: VocabAssignHubProps) {
  const base = role === "admin" ? "/admin/vocab" : "/teacher/vocab";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">폴더별 배정</h2>
        {folders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
            폴더가 없습니다. 「단어세트 만들기」에서 폴더를 먼저 만드세요.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{folder.name}</p>
                  <p className="text-sm text-slate-500">
                    단어세트 {folder.setCount}개
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`${base}/folder/${folder.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    세트 보기
                  </Link>
                  <Link
                    href={`${base}/folder/${folder.id}?openAssign=1`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    배정하기
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unfiledSets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">미분류 단어세트</h2>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {unfiledSets.map((set) => (
              <li
                key={set.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{set.title}</p>
                  <p className="text-sm text-slate-500">{set.itemCount} 카드</p>
                </div>
                <Link
                  href={`${base}/set/${set.id}`}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  열어서 배정
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
