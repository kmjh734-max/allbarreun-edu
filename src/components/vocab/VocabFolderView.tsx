"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderHeader } from "@/components/vocab/FolderHeader";
import { VocabAssignModal } from "@/components/vocab/VocabAssignModal";
import { VocabFolderToolbar } from "@/components/vocab/VocabFolderToolbar";
import { VocabSetCreateLauncher } from "@/components/vocab/VocabSetCreateLauncher";
import { VocabSetList } from "@/components/vocab/VocabSetList";
import type { VocabSetRowData } from "@/components/vocab/VocabSetRow";
import type { VocabAssignmentSectionProps } from "@/components/vocab/VocabAssignmentSection";
import * as adminActions from "@/app/admin/vocab/actions";
import * as teacherActions from "@/app/teacher/vocab/actions";
import type { VocabAssignPanelData } from "@/lib/vocab/assign-panel-types";
import type { Profile } from "@/types/database";

interface FolderOption {
  id: string;
  name: string;
}

interface VocabFolderViewProps {
  role: "admin" | "teacher";
  initialAssignOpen?: boolean;
  folderId: string;
  folderName: string;
  academyName: string;
  ownerName: string;
  ownerUsername: string | null;
  sets: VocabSetRowData[];
  folders: FolderOption[];
  teachers?: Profile[];
}

export function VocabFolderView({
  role,
  initialAssignOpen = false,
  folderId,
  folderName,
  academyName,
  ownerName,
  ownerUsername,
  sets,
  folders,
  teachers,
}: VocabFolderViewProps) {
  const router = useRouter();
  const basePath = role === "admin" ? "/admin/vocab" : "/teacher/vocab";
  const actions = role === "admin" ? adminActions : teacherActions;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"folder" | "set" | "bulk">(
    "folder"
  );
  const [singleSetId, setSingleSetId] = useState<string | null>(null);
  const [bulkDialog, setBulkDialog] = useState<"move" | "copy" | null>(null);
  const [targetFolder, setTargetFolder] = useState(folderId);
  const [loading, setLoading] = useState(false);
  const [assignPanel, setAssignPanel] = useState<VocabAssignPanelData | null>(
    null
  );
  const [assignPanelLoading, setAssignPanelLoading] = useState(false);
  const [assignPanelError, setAssignPanelError] = useState<string | null>(null);

  const selectedIds = useMemo(() => [...selected], [selected]);
  const allSelected = sets.length > 0 && selected.size === sets.length;

  const singleSet = singleSetId
    ? sets.find((s) => s.id === singleSetId)
    : undefined;

  const bulkTitles = sets
    .filter((s) => selected.has(s.id))
    .map((s) => s.title);

  function openFolderAssign() {
    setAssignMode("folder");
    setSingleSetId(null);
    setAssignOpen(true);
  }

  useEffect(() => {
    if (initialAssignOpen) {
      openFolderAssign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from URL
  }, [initialAssignOpen]);

  useEffect(() => {
    if (!assignOpen) return;

    const url =
      assignMode === "set" && singleSetId
        ? `/api/vocab/assign-panel?setId=${encodeURIComponent(singleSetId)}`
        : `/api/vocab/assign-panel?folderId=${encodeURIComponent(folderId)}`;

    let cancelled = false;
    setAssignPanelLoading(true);
    setAssignPanelError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<VocabAssignPanelData>;
      })
      .then((data) => {
        if (!cancelled) {
          setAssignPanel(data);
          setAssignPanelLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssignPanelError("배정 정보를 불러오지 못했습니다.");
          setAssignPanelLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assignOpen, assignMode, singleSetId, folderId]);

  function openSetAssign(setId: string) {
    setAssignMode("set");
    setSingleSetId(setId);
    setAssignOpen(true);
  }

  function openBulkAssign() {
    if (selected.size === 0) return;
    setAssignMode("bulk");
    setSingleSetId(null);
    setAssignOpen(true);
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sets.map((s) => s.id)));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `선택한 ${selected.size}개 단어장을 삭제하시겠습니까?`
      )
    ) {
      return;
    }
    setLoading(true);
    const result = await actions.bulkDeleteVocabSets(selectedIds, folderId);
    setLoading(false);
    window.alert(result.message);
    if (result.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }

  async function handleBulkMove() {
    if (!targetFolder || selected.size === 0) return;
    setLoading(true);
    const result = await actions.bulkMoveVocabSets(selectedIds, targetFolder);
    setLoading(false);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setBulkDialog(null);
    setSelected(new Set());
    router.push(`${basePath}/folder/${targetFolder}`);
    router.refresh();
  }

  function openBulkPrint() {
    if (selected.size === 0) return;
    const params = new URLSearchParams({
      sets: selectedIds.join(","),
      back: `${basePath}/folder/${folderId}`,
    });
    window.open(`${basePath}/print?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  async function handleBulkCopy() {
    if (!targetFolder || selected.size === 0) return;
    setLoading(true);
    let ok = 0;
    for (const id of selectedIds) {
      const result = await actions.copyVocabSet(id, targetFolder);
      if (result.ok) ok++;
      else {
        window.alert(result.message);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    setBulkDialog(null);
    setSelected(new Set());
    window.alert(`${ok}개 단어장이 복사되었습니다.`);
    router.refresh();
  }

  const assignmentProps: VocabAssignmentSectionProps | null = assignPanel
    ? assignMode === "folder"
      ? {
          role,
          variant: "folder",
          folderId,
          scopeLabel: folderName,
          setCount: assignPanel.setCount,
          setTitles: assignPanel.setTitles,
          classes: assignPanel.classes,
          allStudents: assignPanel.allStudents,
          assignments: assignPanel.assignments,
        }
      : assignMode === "bulk"
        ? {
            role,
            variant: "bulk",
            setIds: selectedIds,
            scopeLabel: `${selected.size}개 단어세트`,
            setCount: selected.size,
            setTitles: bulkTitles,
            classes: assignPanel.classes,
            allStudents: assignPanel.allStudents,
            assignments: [],
          }
        : {
            role,
            variant: "set",
            setId: singleSetId!,
            scopeLabel: singleSet?.title ?? "",
            setCount: 1,
            setTitles: singleSet ? [singleSet.title] : [],
            classes: assignPanel.classes,
            allStudents: assignPanel.allStudents,
            assignments: assignPanel.assignments.filter(
              (a) => a.set_id === singleSetId
            ),
          }
    : null;

  const assignModalTitle =
    assignMode === "folder"
      ? `폴더 배정 — ${folderName}`
      : assignMode === "bulk"
        ? `선택 세트 배정 (${selected.size}개)`
        : `단어장 배정 — ${singleSet?.title ?? ""}`;

  return (
    <div className="space-y-0">
      <FolderHeader
        role={role}
        folderId={folderId}
        folderName={folderName}
        basePath={basePath}
        academyName={academyName}
        ownerName={ownerName}
        ownerUsername={ownerUsername}
        setCount={sets.length}
        onAssignClick={openFolderAssign}
        createSetButton={
          <VocabSetCreateLauncher
            role={role}
            folderId={folderId}
            teachers={teachers}
            basePath={basePath}
            onCreate={actions.createVocabSet}
          />
        }
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <VocabFolderToolbar
          totalCount={sets.length}
          selectedCount={selected.size}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onMove={() => {
            setTargetFolder(folderId);
            setBulkDialog("move");
          }}
          onAssign={openBulkAssign}
          onCopy={() => {
            setTargetFolder(folders[0]?.id ?? folderId);
            setBulkDialog("copy");
          }}
          onDelete={handleBulkDelete}
          onPrint={openBulkPrint}
          disabled={loading}
        />

        {sets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-600">이 폴더에 단어세트가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-500">
              아래 버튼으로 첫 단어세트를 만들어 보세요.
            </p>
          </div>
        ) : (
          <VocabSetList
            role={role}
            folderId={folderId}
            basePath={basePath}
            folders={folders}
            sets={sets}
            selected={selected}
            onSelectionChange={(setId, checked) => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(setId);
                else next.delete(setId);
                return next;
              });
            }}
            onAssignSet={openSetAssign}
          />
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <VocabSetCreateLauncher
          role={role}
          folderId={folderId}
          teachers={teachers}
          basePath={basePath}
          onCreate={actions.createVocabSet}
        />
      </div>

      <VocabAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={assignModalTitle}
        assignment={assignmentProps}
        loading={assignPanelLoading}
        error={assignPanelError}
      />

      {bulkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="font-semibold text-slate-900">
              {bulkDialog === "move"
                ? `${selected.size}개 세트 이동`
                : `${selected.size}개 세트 복사`}
            </p>
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
                onClick={
                  bulkDialog === "move" ? handleBulkMove : handleBulkCopy
                }
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "처리 중…" : bulkDialog === "move" ? "이동" : "복사"}
              </button>
              <button
                type="button"
                onClick={() => setBulkDialog(null)}
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
