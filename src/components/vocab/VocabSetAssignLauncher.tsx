"use client";

import { useEffect, useState } from "react";
import { VocabAssignModal } from "@/components/vocab/VocabAssignModal";
import type { VocabAssignmentSectionProps } from "@/components/vocab/VocabAssignmentSection";
import type { VocabAssignPanelData } from "@/lib/vocab/assign-panel-types";

interface VocabSetAssignLauncherProps {
  title: string;
  role: "admin" | "teacher";
  setId: string;
  setTitle: string;
}

export function VocabSetAssignLauncher({
  title,
  role,
  setId,
  setTitle,
}: VocabSetAssignLauncherProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<VocabAssignPanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#assign") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/vocab/assign-panel?setId=${encodeURIComponent(setId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json() as Promise<VocabAssignPanelData>;
      })
      .then((data) => {
        if (!cancelled) {
          setPanel(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("배정 정보를 불러오지 못했습니다.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, setId]);

  const assignment: VocabAssignmentSectionProps | null = panel
    ? {
        variant: "set",
        role,
        setId,
        scopeLabel: setTitle,
        setCount: panel.setCount,
        setTitles: panel.setTitles,
        classes: panel.classes,
        allStudents: panel.allStudents,
        assignments: panel.assignments,
      }
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-lg border-2 border-emerald-600 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
      >
        학생·반 배정
      </button>
      <VocabAssignModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        assignment={assignment}
        loading={loading}
        error={error}
      />
    </>
  );
}
