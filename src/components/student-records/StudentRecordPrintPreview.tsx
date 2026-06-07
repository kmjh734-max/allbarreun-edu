"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { buildStudentRecordPdfFileName } from "@/lib/student-records/pdf-filename";

interface StudentRecordPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  html: string;
  studentName: string;
}

export function StudentRecordPrintPreview({
  open,
  onClose,
  html,
  studentName,
}: StudentRecordPrintPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfFileName = buildStudentRecordPdfFileName(studentName);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  function handlePrint() {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    const doc = frame.contentDocument;
    if (doc) {
      doc.title = pdfFileName.replace(/\.pdf$/i, "");
    }
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }

  return createPortal(
    <div
      id="student-record-print-modal"
      className="no-print fixed inset-0 z-[100] flex flex-col bg-slate-900/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="no-print flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="font-semibold text-slate-900">학생부 분석 PDF 미리보기</p>
          <p className="text-xs text-slate-500">{pdfFileName}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button type="button" onClick={handlePrint}>
            PDF 저장 / 인쇄
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-200 py-6">
        <div id="student-record-print-root" className="mx-auto max-w-[210mm] bg-white shadow-lg">
          <iframe
            ref={iframeRef}
            title="학생부 분석 보고서"
            srcDoc={html}
            className="min-h-[297mm] w-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
