"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DeleteFolderButton } from "@/components/vocab/DeleteFolderButton";
import { VocabClassSidebarDelete } from "@/components/vocab/VocabClassSidebarDelete";
import { useVocabSidebar } from "@/components/vocab/VocabSidebarContext";
import type { VocabSidebarSet } from "@/components/vocab/vocab-sidebar-types";
import type { Class } from "@/types/database";

interface VocabCombinedSidebarProps {
  role: "admin" | "teacher";
  classesHref: string;
  mode: "status" | "assign" | "sets";
  onCreateFolder?: (name: string) => Promise<{ ok: boolean; message: string }>;
  onDeleteFolder?: (
    folderId: string
  ) => Promise<{ ok: boolean; message: string }>;
}

const NAV_ITEMS = [
  { suffix: "sets", label: "단어세트 만들기", icon: "📚" },
  { suffix: "assign", label: "단어세트 배정하기", icon: "📋" },
  { suffix: "status", label: "단어학습 현황", icon: "📊" },
] as const;

const RESERVED = new Set(["sets", "assign", "status"]);

function isSetsSectionActive(pathname: string, base: string): boolean {
  if (pathname === `${base}/sets`) return true;
  if (!pathname.startsWith(`${base}/`)) return false;
  const rest = pathname.slice(base.length + 1);
  const segment = rest.split("/")[0] ?? "";
  if (!segment || RESERVED.has(segment)) return false;
  return segment === "folder" || segment === "set";
}

export function VocabCombinedSidebar({
  role,
  classesHref,
  mode,
  onCreateFolder,
  onDeleteFolder,
}: VocabCombinedSidebarProps) {
  const pathname = usePathname();
  const base = role === "admin" ? "/admin/vocab" : "/teacher/vocab";
  const activeClass =
    "bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-200/80";

  const effectiveMode =
    pathname.includes("/status") || mode === "status"
      ? "status"
      : pathname.includes("/assign") || mode === "assign"
        ? "assign"
        : "sets";
  const showFolderPanel = effectiveMode === "sets" || effectiveMode === "assign";
  const { folders, sets, classes } = useVocabSidebar();

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:w-64">
      <div className="shrink-0 border-b border-slate-100 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          단어학습
        </p>
        <p className="mt-1 text-sm text-slate-600">세트 · 배정 · 현황</p>
      </div>

      <nav className="shrink-0 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item, index) => {
          const href = `${base}/${item.suffix}`;
          const active =
            item.suffix === "sets"
              ? isSetsSectionActive(pathname, base)
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.suffix}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                active
                  ? activeClass
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>
              <span>
                <span className="text-xs text-slate-500">{index + 1}.</span>{" "}
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {showFolderPanel && (
        <VocabFolderPanel
          role={role}
          base={base}
          pathname={pathname}
          classesHref={classesHref}
          mode={effectiveMode === "assign" ? "assign" : "sets"}
          folders={folders}
          sets={sets}
          classes={classes}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
        />
      )}
    </aside>
  );
}

function navLink(pathname: string, href: string, activeClass: string) {
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  return active ? activeClass : "text-slate-700 hover:bg-slate-50";
}

function VocabFolderPanel({
  role,
  base,
  pathname,
  classesHref,
  mode,
  folders,
  sets,
  classes,
  onCreateFolder,
  onDeleteFolder,
}: {
  role: "admin" | "teacher";
  base: string;
  pathname: string;
  classesHref: string;
  mode: "assign" | "sets";
  folders: { id: string; name: string }[];
  sets: VocabSidebarSet[];
  classes: Class[];
  onCreateFolder?: (name: string) => Promise<{ ok: boolean; message: string }>;
  onDeleteFolder?: (
    folderId: string
  ) => Promise<{ ok: boolean; message: string }>;
}) {
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const setsByFolder = new Map<string, VocabSidebarSet[]>();
  let unfiledCount = 0;
  for (const s of sets) {
    if (s.folder_id) {
      const list = setsByFolder.get(s.folder_id) ?? [];
      list.push(s);
      setsByFolder.set(s.folder_id, list);
    } else {
      unfiledCount++;
    }
  }

  async function handleCreateFolder() {
    if (!onCreateFolder || !folderName.trim()) return;
    setCreatingFolder(true);
    setMsg(null);
    const result = await onCreateFolder(folderName.trim());
    setMsg(result.message);
    if (result.ok) setFolderName("");
    setCreatingFolder(false);
  }

  const activeNav =
    "bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-200/80";

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-slate-200">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold text-slate-600">나의 폴더</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {mode === "sets" && onCreateFolder && (
          <>
            <div className="flex gap-1.5">
              <input
                className="ui-input min-h-0 flex-1 py-2 text-sm"
                placeholder="새 폴더 이름"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateFolder()}
              />
              <button
                type="button"
                disabled={creatingFolder}
                onClick={() => void handleCreateFolder()}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                + 폴더
              </button>
            </div>
            {msg && (
              <p className="mt-1 px-1 text-xs text-slate-600" role="status">
                {msg}
              </p>
            )}
          </>
        )}

        <div className={`space-y-0.5 ${mode === "sets" ? "mt-2" : ""}`}>
          {mode === "sets" && (
            <Link
              href={`${base}/sets`}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === `${base}/sets`
                  ? activeNav
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              전체 보기
            </Link>
          )}

          {folders.map((folder) => {
            const folderSets = setsByFolder.get(folder.id) ?? [];
            const folderHref = `${base}/folder/${folder.id}`;
            const assignHref = `${folderHref}?openAssign=1`;
            const href = mode === "assign" ? assignHref : folderHref;
            const active =
              mode === "sets" &&
              (pathname === folderHref || pathname.startsWith(`${folderHref}/`));

            return (
              <div
                key={folder.id}
                className={`flex items-center gap-0.5 rounded-lg pr-1 ${
                  active ? activeNav : ""
                }`}
              >
                <Link
                  href={href}
                  className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm ${
                    active ? "" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden>📁</span>
                  <span className="truncate font-medium">{folder.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-400">
                    {folderSets.length}
                  </span>
                </Link>
                {mode === "sets" && onDeleteFolder && (
                  <DeleteFolderButton
                    folderId={folder.id}
                    folderName={folder.name}
                    basePath={base}
                    onDelete={onDeleteFolder}
                  />
                )}
              </div>
            );
          })}

          {unfiledCount > 0 && (
            <p className="px-2 pt-1 text-xs text-slate-400">
              미분류 세트 {unfiledCount}개
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="px-1 text-xs font-bold text-slate-600">
            나의 클래스 ({classes.length})
          </p>
          <div className="mt-2 space-y-0.5">
            <Link
              href={classesHref}
              className={`block rounded-lg px-3 py-2 text-sm ${navLink(pathname, classesHref, activeNav)}`}
            >
              + 클래스 관리
            </Link>
            {classes.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">
                등록된 반이 없습니다.
              </p>
            ) : (
              classes.map((cls) => {
                const href =
                  role === "admin"
                    ? `/admin/classes/${cls.id}`
                    : `/teacher/classes/${cls.id}`;
                return (
                  <div
                    key={cls.id}
                    className={`flex items-center gap-0.5 rounded-lg pr-1 ${navLink(pathname, href, activeNav)}`}
                  >
                    <Link
                      href={href}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm"
                    >
                      <span className="text-emerald-600" aria-hidden>
                        👥
                      </span>
                      <span className="truncate">{cls.name}</span>
                    </Link>
                    <VocabClassSidebarDelete
                      role={role}
                      classId={cls.id}
                      className={cls.name}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
