"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { buildReportPdfFileName } from "@/lib/reports/report-pdf-filename";

interface PcKakaoSendModalProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  rangeLabel: string;
  parentMessage: string;
  copySucceeded: boolean;
  onOpenPrint: () => void;
  pdfFileName?: string;
  title?: string;
}

/** PC 카카오톡 수동 발송 안내 (API 미사용) */
export function PcKakaoSendModal({
  open,
  onClose,
  studentName,
  rangeLabel,
  parentMessage,
  copySucceeded,
  onOpenPrint,
  pdfFileName: pdfFileNameProp,
  title = "PC 카톡 발송 준비 완료",
}: PcKakaoSendModalProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const pdfFileName =
    pdfFileNameProp ?? buildReportPdfFileName(studentName, rangeLabel);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  async function handleCopyAgain() {
    try {
      await navigator.clipboard.writeText(parentMessage);
      setCopyMessage("학부모 발송용 문구가 다시 복사되었습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
    window.setTimeout(() => setCopyMessage(null), 4000);
  }

  return createPortal(
    <div
      className="no-print fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pc-kakao-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2
          id="pc-kakao-modal-title"
          className="text-lg font-semibold text-slate-900"
        >
          {title}
        </h2>

        <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700">
          <li>
            {copySucceeded
              ? "학부모 발송용 문구가 복사되었습니다."
              : "문구 복사에 실패했습니다. 「문구 다시 복사」를 눌러 주세요."}
          </li>
          <li>
            「PDF 저장 / 인쇄」 버튼을 눌러 리포트를 PDF로 저장해 주세요.
          </li>
          <li>
            PC 카카오톡에서 학부모님 대화창을 열고{" "}
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1 text-xs">
              Ctrl
            </kbd>
            +
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1 text-xs">
              V
            </kbd>
            로 문구를 붙여넣으세요.
          </li>
          <li>
            저장한 PDF 파일을 대화창에 드래그하거나 첨부하면 됩니다.
          </li>
        </ul>

        <div className="mt-4 rounded-lg border border-[#1e3a5f]/15 bg-[#f4f7fb] px-4 py-3">
          <p className="text-xs font-medium text-slate-500">권장 PDF 파일명</p>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-[#1e3a5f]">
            {pdfFileName}
          </p>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          브라우저 보안 정책상 웹사이트에서 PC 카카오톡 대화창에 파일을 자동
          첨부해 전송할 수는 없습니다. 문구 복사와 PDF 저장 후 PC 카카오톡에서
          직접 전송해 주세요.
        </p>

        {copyMessage && (
          <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
            {copyMessage}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={() => onOpenPrint()}>
            PDF 저장 / 인쇄
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleCopyAgain()}
          >
            문구 다시 복사
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
