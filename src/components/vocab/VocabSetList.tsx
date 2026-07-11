"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VocabSetRow, type VocabSetRowData } from "@/components/vocab/VocabSetRow";
import * as adminReorder from "@/app/admin/vocab/reorder-actions";
import * as teacherReorder from "@/app/teacher/vocab/reorder-actions";

interface FolderOption {
  id: string;
  name: string;
}

interface VocabSetListProps {
  role: "admin" | "teacher";
  folderId: string;
  basePath: string;
  folders: FolderOption[];
  sets: VocabSetRowData[];
  selected: Set<string>;
  onSelectionChange: (setId: string, checked: boolean) => void;
  onAssignSet: (setId: string) => void;
}

function reorderList(
  items: VocabSetRowData[],
  fromId: string,
  toId: string
): VocabSetRowData[] {
  if (fromId === toId) return items;
  const fromIndex = items.findIndex((s) => s.id === fromId);
  const toIndex = items.findIndex((s) => s.id === toId);
  if (fromIndex < 0 || toIndex < 0) return items;

  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export function VocabSetList({
  role,
  folderId,
  basePath,
  folders,
  sets,
  selected,
  onSelectionChange,
  onAssignSet,
}: VocabSetListProps) {
  const router = useRouter();
  const reorderAction =
    role === "admin"
      ? adminReorder.reorderVocabSetsInFolder
      : teacherReorder.reorderVocabSetsInFolder;

  const [ordered, setOrdered] = useState(sets);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrdered(sets);
  }, [sets]);

  async function persistOrder(next: VocabSetRowData[]) {
    setSaving(true);
    try {
      const result = await reorderAction(
        folderId,
        next.map((s) => s.id)
      );
      if (!result.ok) {
        window.alert(result.message);
        setOrdered(sets);
        return;
      }
      router.refresh();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "순서 저장에 실패했습니다."
      );
      setOrdered(sets);
    } finally {
      setSaving(false);
      setDraggingId(null);
      setOverId(null);
    }
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const next = reorderList(ordered, draggingId, targetId);
    setOrdered(next);
    void persistOrder(next);
  }

  return (
    <ul className={saving ? "pointer-events-none opacity-70" : ""}>
      {ordered.map((set) => {
        const isDragging = draggingId === set.id;
        const isOver = overId === set.id && draggingId !== set.id;

        return (
          <li
            key={set.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverId(set.id);
            }}
            onDragLeave={() => {
              if (overId === set.id) setOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(set.id);
            }}
            className={
              isOver ? "ring-2 ring-inset ring-emerald-400/60" : undefined
            }
          >
            <VocabSetRow
              role={role}
              set={set}
              folderId={folderId}
              basePath={basePath}
              folders={folders}
              checked={selected.has(set.id)}
              onCheckedChange={(checked) => onSelectionChange(set.id, checked)}
              onAssignSet={() => onAssignSet(set.id)}
              isDragging={isDragging}
              onDragHandleStart={(e) => {
                e.dataTransfer.setData("text/set-id", set.id);
                e.dataTransfer.effectAllowed = "move";
                setDraggingId(set.id);
              }}
              onDragHandleEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}
