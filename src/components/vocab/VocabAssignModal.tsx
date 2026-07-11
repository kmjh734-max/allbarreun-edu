"use client";

import { useEffect } from "react";
import { VocabAssignmentSection } from "@/components/vocab/VocabAssignmentSection";
import type { VocabAssignmentSectionProps } from "@/components/vocab/VocabAssignmentSection";

interface VocabAssignModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  assignment: VocabAssignmentSectionProps | null;
  loading?: boolean;
  error?: string | null;
}

export function VocabAssignModal({
  open,
  onClose,
  title,
  assignment,
  loading = false,
  error = null,
}: VocabAssignModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vocab-assign-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2
            id="vocab-assign-title"
            className="text-lg font-bold text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              배정 정보를 불러오는 중…
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : assignment ? (
            <VocabAssignmentSection {...assignment} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
