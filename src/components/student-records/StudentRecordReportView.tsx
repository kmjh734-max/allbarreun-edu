"use client";

import { useRef, useState } from "react";
import { PcKakaoSendModal } from "@/components/reports/PcKakaoSendModal";
import { StudentRecordPrintPreview } from "@/components/student-records/StudentRecordPrintPreview";
import { StudentRecordShareActions } from "@/components/student-records/StudentRecordShareActions";
import { buildStudentRecordKakaoMessage } from "@/lib/student-records/build-kakao-message";
import { buildStudentRecordPdfFileName } from "@/lib/student-records/pdf-filename";
import type { StudentRecordAnalysisResult } from "@/lib/student-records/types";

interface StudentRecordReportViewProps {
  result: StudentRecordAnalysisResult;
  onReset: () => void;
  /** 본문 수정 저장 후 상위 상태 동기화 */
  onHtmlSaved?: (html: string) => void;
}

export function StudentRecordReportView({
  result,
  onReset,
  onHtmlSaved,
}: StudentRecordReportViewProps) {
  const [printOpen, setPrintOpen] = useState(false);
  const [pcKakaoOpen, setPcKakaoOpen] = useState(false);
  const [pcKakaoCopyOk, setPcKakaoCopyOk] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const canEdit = Boolean(result.recordId);

  function startEditing() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.designMode = "on";
    setEditError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditError(null);
    // iframe을 다시 그려 수정 전 내용으로 복원
    setIframeKey((k) => k + 1);
  }

  async function saveEditing() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !result.recordId) return;

    const html = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/student-records/history/${result.recordId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "저장에 실패했습니다.");
      }
      doc.designMode = "off";
      setEditing(false);
      onHtmlSaved?.(html);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const parentMessage = buildStudentRecordKakaoMessage({
    studentName: result.studentName,
  });

  async function handlePcKakaoPrepare() {
    let copied = false;
    try {
      await navigator.clipboard.writeText(parentMessage);
      copied = true;
    } catch {
      copied = false;
    }
    setPcKakaoCopyOk(copied);
    setPrintOpen(true);
    setPcKakaoOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div>
          <p className="font-semibold text-emerald-900">
            {result.studentName} 학생 · 학생부 분석 완료
          </p>
          <p className="text-xs text-emerald-800">
            생성: {new Date(result.generatedAt).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && !editing && (
            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
              onClick={startEditing}
            >
              ✏️ 내용 수정
            </button>
          )}
          {editing && (
            <>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
                onClick={() => void saveEditing()}
              >
                {saving ? "저장 중…" : "수정 내용 저장"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={saving}
                onClick={cancelEditing}
              >
                취소
              </button>
            </>
          )}
          <button
            type="button"
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            onClick={onReset}
          >
            ← 학생부 분석 메인으로
          </button>
        </div>
      </div>

      {editing && (
        <p className="no-print rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          편집 모드입니다. 아래 보고서에서 고치고 싶은 글자를 직접 클릭해서
          수정한 뒤, 위의 <b>수정 내용 저장</b> 버튼을 눌러 주세요.
        </p>
      )}
      {editError && (
        <p className="no-print rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {editError}
        </p>
      )}

      <StudentRecordShareActions
        result={result}
        onOpenPrint={() => setPrintOpen(true)}
        onPcKakaoPrepare={handlePcKakaoPrepare}
      />

      <div
        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
          editing ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"
        }`}
      >
        <iframe
          key={iframeKey}
          ref={iframeRef}
          title={`${result.studentName} 학생부 분석`}
          srcDoc={result.html}
          className="min-h-[80vh] w-full border-0"
          sandbox="allow-same-origin"
        />
      </div>

      <div className="no-print">
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onReset}
        >
          ← 학생부 분석 메인으로 돌아가기
        </button>
      </div>

      <StudentRecordPrintPreview
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        html={result.html}
        studentName={result.studentName}
      />

      <PcKakaoSendModal
        open={pcKakaoOpen}
        onClose={() => setPcKakaoOpen(false)}
        studentName={result.studentName}
        rangeLabel="학생부 분석"
        parentMessage={parentMessage}
        copySucceeded={pcKakaoCopyOk}
        onOpenPrint={() => setPrintOpen(true)}
        pdfFileName={buildStudentRecordPdfFileName(result.studentName)}
        title="PC 카카오 학생부 분석 발송"
      />
    </div>
  );
}
