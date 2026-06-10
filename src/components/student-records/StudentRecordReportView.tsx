"use client";

import { useState } from "react";
import { PcKakaoSendModal } from "@/components/reports/PcKakaoSendModal";
import { StudentRecordPrintPreview } from "@/components/student-records/StudentRecordPrintPreview";
import { StudentRecordShareActions } from "@/components/student-records/StudentRecordShareActions";
import { buildStudentRecordKakaoMessage } from "@/lib/student-records/build-kakao-message";
import { buildStudentRecordPdfFileName } from "@/lib/student-records/pdf-filename";
import type { StudentRecordAnalysisResult } from "@/lib/student-records/types";

interface StudentRecordReportViewProps {
  result: StudentRecordAnalysisResult;
  onReset: () => void;
}

export function StudentRecordReportView({
  result,
  onReset,
}: StudentRecordReportViewProps) {
  const [printOpen, setPrintOpen] = useState(false);
  const [pcKakaoOpen, setPcKakaoOpen] = useState(false);
  const [pcKakaoCopyOk, setPcKakaoCopyOk] = useState(false);

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
        <button
          type="button"
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          onClick={onReset}
        >
          ← 학생부 분석 메인으로
        </button>
      </div>

      <StudentRecordShareActions
        result={result}
        onOpenPrint={() => setPrintOpen(true)}
        onPcKakaoPrepare={handlePcKakaoPrepare}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <iframe
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
