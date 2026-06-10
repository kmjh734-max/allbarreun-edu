"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StudentRecordReportView } from "@/components/student-records/StudentRecordReportView";
import type {
  ReportClassOption,
  ReportStudentOption,
} from "@/lib/reports/types";
import {
  chunkStudentRecordFiles,
  fetchStudentRecordApi,
  formatBytes,
  prepareStudentRecordFiles,
  readStudentRecordApiResponse,
  STUDENT_RECORD_MAX_PDF_PAGES,
  validatePreparedExtractChunk,
  validatePreparedStudentRecordFiles,
  validateStudentRecordFiles,
} from "@/lib/student-records/client-upload";
import { STUDENT_RECORD_MAX_IMAGE_BYTES } from "@/lib/student-records/limits";
import { DEFAULT_ANALYSIS_INSTRUCTIONS } from "@/lib/student-records/simple-analysis-prompt";
import { isPdfUpload } from "@/lib/student-records/file-types";
import { STUDENT_RECORD_EXTRACT_CHUNK_PARALLEL } from "@/lib/student-records/limits";
import {
  hasSubstantiveStudentRecordText,
  isReliableStudentRecordExtract,
} from "@/lib/student-records/ocr-quality";
import type { StudentRecordAnalysisResult } from "@/lib/student-records/types";

const PROGRESS_PREP_END = 12;
const PROGRESS_OCR_END = 72;
const PROGRESS_GENERATE_END = 98;

type ExtractApiResult = {
  ok: boolean;
  message?: string;
  text?: string;
  studentId?: string | null;
  studentName?: string;
};

type HistoryRecord = {
  id: string;
  studentName: string;
  school: string | null;
  generatedAt: string;
  createdAt: string;
};

interface StudentRecordWorkspaceProps {
  initialClasses?: ReportClassOption[];
  initialStudents?: ReportStudentOption[];
}

export function StudentRecordWorkspace({
  initialClasses = [],
  initialStudents = [],
}: StudentRecordWorkspaceProps) {
  const [classes, setClasses] = useState<ReportClassOption[]>(initialClasses);
  const [students, setStudents] = useState<ReportStudentOption[]>(initialStudents);
  const [classId, setClassId] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [loginQuery, setLoginQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualStudentName, setManualStudentName] = useState("");
  const [analysisInstructions, setAnalysisInstructions] = useState(
    DEFAULT_ANALYSIS_INSTRUCTIONS
  );
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<StudentRecordAnalysisResult | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const updateProgress = useCallback((label: string, percent: number) => {
    setProgressLabel(label);
    setProgressPercent(Math.min(100, Math.max(0, Math.round(percent))));
  }, []);

  const loadStudents = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (nameQuery.trim()) params.set("name", nameQuery.trim());
      if (loginQuery.trim()) params.set("loginId", loginQuery.trim());

      const res = await fetch(`/api/reports/students?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "학생 목록을 불러오지 못했습니다.");
      }
      setClasses(data.classes ?? []);
      setStudents(data.students ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setListLoading(false);
    }
  }, [classId, nameQuery, loginQuery]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/student-records/history");
      const data = await res.json();
      if (res.ok && data.ok) {
        setHistory(data.records ?? []);
      }
    } catch {
      // 기록 로딩 실패는 분석 기능에 영향 없음
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function openHistoryRecord(id: string) {
    setHistoryBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/student-records/history/${id}`);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.record?.html) {
        throw new Error(data.message ?? "기록을 불러오지 못했습니다.");
      }
      setResult({
        studentId: data.record.studentId ?? null,
        studentName: data.record.studentName ?? "학생",
        html: data.record.html,
        generatedAt: data.record.generatedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록을 불러오지 못했습니다.");
    } finally {
      setHistoryBusyId(null);
    }
  }

  function startEditingRecord(record: HistoryRecord) {
    setEditingId(record.id);
    setEditingTitle(
      record.school
        ? `${record.school} · ${record.studentName}`
        : record.studentName
    );
  }

  async function renameHistoryRecord(id: string) {
    const title = editingTitle.trim();
    if (!title) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setHistoryBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/student-records/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "제목 수정에 실패했습니다.");
      }
      setHistory((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, studentName: title, school: null } : r
        )
      );
      setEditingId(null);
      setEditingTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "제목 수정에 실패했습니다.");
    } finally {
      setHistoryBusyId(null);
    }
  }

  async function deleteHistoryRecord(id: string) {
    if (!window.confirm("이 분석 기록을 삭제할까요?")) return;
    setHistoryBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/student-records/history/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "기록 삭제에 실패했습니다.");
      }
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "기록 삭제에 실패했습니다.");
    } finally {
      setHistoryBusyId(null);
    }
  }

  const hasInitialLists =
    initialClasses.length > 0 || initialStudents.length > 0;

  useEffect(() => {
    if (hasInitialLists && !classId && !nameQuery.trim() && !loginQuery.trim()) {
      return;
    }
    void loadStudents();
  }, [loadStudents, hasInitialLists, classId, nameQuery, loginQuery]);

  async function runAnalysis() {
    if (files.length === 0) {
      setError("분석할 PDF 또는 이미지를 업로드해 주세요.");
      return;
    }

    const fileError = validateStudentRecordFiles(files);
    if (fileError) {
      setError(fileError);
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);
    updateProgress("분석 준비 중…", 0);
    try {
      const pdfFiles = files.filter(isPdfUpload);
      const directImageFiles = files.filter((file) => !isPdfUpload(file));
      let resolvedStudentId: string | null = null;
      let resolvedStudentName = "";
      let combinedExtractedText = "";

      const buildFormData = () => {
        const formData = new FormData();
        if (selectedStudentId) formData.set("studentId", selectedStudentId);
        if (!selectedStudentId && manualStudentName.trim()) {
          formData.set("studentName", manualStudentName.trim());
        }
        return formData;
      };

      const postExtract = async (formData: FormData) => {
        const extractRes = await fetchStudentRecordApi(
          "/api/student-records/extract",
          {
            method: "POST",
            body: formData,
          }
        );
        const { data, error } =
          await readStudentRecordApiResponse<ExtractApiResult>(extractRes);
        if (error) throw new Error(error);
        return data;
      };

      if (!combinedExtractedText) {
        updateProgress("준비 단계 · 업로드한 파일을 변환하고 있어요", 4);
        const preparedFiles = await prepareStudentRecordFiles(files, (label) => {
          if (label.startsWith("PDF 변환")) {
            const match = label.match(/(\d+)\/(\d+)/);
            if (match) {
              const current = Number(match[1]);
              const total = Number(match[2]);
              const pct =
                4 + (current / Math.max(total, 1)) * (PROGRESS_PREP_END - 4);
              updateProgress(
                `준비 단계 · PDF를 페이지 이미지로 변환 중 (${current}/${total}페이지)`,
                pct
              );
              return;
            }
          }
          updateProgress("준비 단계 · 업로드한 파일을 변환하고 있어요", 6);
        });
        const preparedError = validatePreparedStudentRecordFiles(preparedFiles);
        if (preparedError) {
          throw new Error(preparedError);
        }

        const imageChunks =
          preparedFiles.length > 0 ? chunkStudentRecordFiles(preparedFiles) : [];
        const ocrTexts: string[] = [];

        if (imageChunks.length === 0) {
          throw new Error(
            "업로드한 파일에서 분석할 이미지를 찾지 못했습니다. 파일을 확인해 주세요."
          );
        } else {
          const ocrSpan = PROGRESS_OCR_END - PROGRESS_PREP_END;

          const extractChunk = async (chunkIndex: number) => {
            const chunk = imageChunks[chunkIndex]!;
            const chunkError = validatePreparedExtractChunk(chunk);
            if (chunkError) throw new Error(chunkError);

            const formData = buildFormData();
            for (const file of chunk) {
              formData.append("files", file);
            }

            const extracted = await postExtract(formData);
            if (!extracted?.ok || !extracted.text || !extracted.studentName) {
              throw new Error(
                extracted?.message ??
                  `${chunkIndex + 1}번째 페이지 묶음 인식에 실패했습니다.`
              );
            }
            return extracted;
          };

          const totalPages = preparedFiles.length;
          let pagesDone = 0;

          for (
            let i = 0;
            i < imageChunks.length;
            i += STUDENT_RECORD_EXTRACT_CHUNK_PARALLEL
          ) {
            const batchIndices = Array.from(
              {
                length: Math.min(
                  STUDENT_RECORD_EXTRACT_CHUNK_PARALLEL,
                  imageChunks.length - i
                ),
              },
              (_, j) => i + j
            );
            const batchPages = batchIndices.reduce(
              (sum, idx) => sum + imageChunks[idx]!.length,
              0
            );

            updateProgress(
              `1단계 · 학생부 내용 읽는 중 (${pagesDone + 1}~${Math.min(pagesDone + batchPages, totalPages)}/${totalPages}페이지)`,
              PROGRESS_PREP_END + (pagesDone / totalPages) * ocrSpan
            );

            const batchResults = await Promise.all(
              batchIndices.map((chunkIndex) => extractChunk(chunkIndex))
            );

            for (const extracted of batchResults) {
              resolvedStudentId = extracted.studentId ?? resolvedStudentId;
              resolvedStudentName = extracted.studentName!;
              ocrTexts.push(extracted.text!);
            }

            pagesDone = Math.min(pagesDone + batchPages, totalPages);

            updateProgress(
              `1단계 · 학생부 내용 읽기 완료 (${pagesDone}/${totalPages}페이지)`,
              PROGRESS_PREP_END + (pagesDone / totalPages) * ocrSpan
            );
          }
        }

        combinedExtractedText = ocrTexts.join("\n\n");
        if (!isReliableStudentRecordExtract(combinedExtractedText)) {
          throw new Error(
            "학생부 OCR 결과가 충분하지 않습니다. 스캔 선명도를 확인한 뒤 다시 업로드해 주세요."
          );
        }
      }

      updateProgress(
        "2단계 · AI가 분석 보고서를 작성 중이에요 (보통 1~3분 소요)",
        PROGRESS_OCR_END + 3
      );

      // 생성 단계는 1~3분 걸리므로 멈춰 보이지 않게 진행률을 천천히 올린다
      const generateTicker = setInterval(() => {
        setProgressPercent((p) =>
          p < PROGRESS_GENERATE_END ? p + 1 : p
        );
      }, 5000);

      let generateRes: Response;
      try {
        generateRes = await fetchStudentRecordApi(
          "/api/student-records/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: resolvedStudentId,
              studentName: resolvedStudentName,
              text: combinedExtractedText,
              analysisInstructions: analysisInstructions.trim(),
            }),
          },
          // 보고서 생성은 1회 2~3분 걸릴 수 있어 재시도는 1회만
          1
        );
      } finally {
        clearInterval(generateTicker);
      }
      const { data: generated, error: generateError } =
        await readStudentRecordApiResponse<{
          ok: boolean;
          message?: string;
          html?: string;
          studentName?: string;
          generatedAt?: string;
        }>(generateRes);

      if (generateError) {
        throw new Error(generateError);
      }
      if (!generated?.ok || !generated.html || !generated.generatedAt) {
        throw new Error(generated?.message ?? "보고서 생성에 실패했습니다.");
      }

      updateProgress("보고서 생성 완료", 100);
      setResult({
        studentId: resolvedStudentId,
        // 학생 미선택 시 서버가 학생부 본문에서 찾아낸 실제 이름 사용
        studentName: generated.studentName ?? resolvedStudentName,
        html: generated.html,
        generatedAt: generated.generatedAt,
      });
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
      setProgressLabel(null);
      setProgressPercent(0);
    }
  }

  if (result) {
    return (
      <StudentRecordReportView
        result={result}
        onReset={() => {
          setResult(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="학생부 분석"
          description="학교생활기록부 텍스트·PDF·이미지를 업로드하면 입학사정관 관점 HTML 보고서를 생성합니다. PDF 저장·카카오톡 발송을 지원합니다."
        />
      </div>

      <section className="no-print space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">1. 학생 선택 (선택)</h2>
        <p className="text-xs text-slate-500">
          학생을 선택하지 않아도 자료만으로 분석할 수 있습니다. 미선택 시 아래
          이름을 입력하거나, 학생부에서 이름을 추출합니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">반</span>
            <select
              className="ui-select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">전체</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">이름 검색</span>
            <input
              className="ui-input"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="학생 이름"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">로그인 ID</span>
            <input
              className="ui-input"
              value={loginQuery}
              onChange={(e) => setLoginQuery(e.target.value)}
              placeholder="아이디"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">학생</span>
          <select
            className="ui-select"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={listLoading}
          >
            <option value="">선택 안 함</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.loginId ? ` (${s.loginId})` : ""}
                {s.classNames.length > 0 ? ` · ${s.classNames.join(", ")}` : ""}
              </option>
            ))}
          </select>
        </label>

        {!selectedStudentId && (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">학생 이름 (선택)</span>
            <input
              className="ui-input"
              value={manualStudentName}
              onChange={(e) => setManualStudentName(e.target.value)}
              placeholder="미입력 시 학생부에서 추출"
            />
          </label>
        )}
      </section>

      <section className="no-print space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          2. 학생부 자료 입력
        </h2>
        <p className="text-xs text-slate-500">
          성적표·세특·창체·행특이 담긴 PDF·이미지(JPG/PNG)를 업로드하세요.
          이미지는 장당 최대{" "}
          {formatBytes(STUDENT_RECORD_MAX_IMAGE_BYTES)}까지 허용합니다. 스캔 PDF는
          고해상도 변환 후 OpenAI Vision(gpt-4o)으로 OCR합니다(최대{" "}
          {STUDENT_RECORD_MAX_PDF_PAGES}페이지). 파일은 자동으로 나눠
          업로드되므로 전체 용량 제한은 없습니다.
        </p>
        <input
          type="file"
          className="block w-full text-sm text-slate-600"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        {files.length > 0 && (
          <ul className="text-xs text-slate-600">
            {files.map((f) => (
              <li key={`${f.name}-${f.size}`}>· {f.name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="no-print space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          3. 분석 요청 (선택)
        </h2>
        <p className="text-xs text-slate-500">
          기본값은 성적·등급 산출, 대학 추천, 세특·행특·창체까지 포함한 종합
          분석입니다. 일부만 분석하려면 요청 내용을 수정해 주세요.
        </p>
        <textarea
          className="ui-input min-h-[120px] text-sm leading-relaxed"
          value={analysisInstructions}
          onChange={(e) => setAnalysisInstructions(e.target.value)}
          placeholder="예: 성적 분석 없이 세특·행특·창체만 요약해 주세요."
        />
      </section>

      {error && (
        <p className="no-print rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      <div className="no-print space-y-3">
        <Button
          type="button"
          disabled={analyzing}
          onClick={() => void runAnalysis()}
        >
          {analyzing
            ? `${progressLabel ?? "분석 생성 중…"} (${progressPercent}%)`
            : "학생부 분석 보고서 생성"}
        </Button>
        {analyzing && (
          <div className="max-w-md space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              {progressLabel ?? "분석 중…"} · {progressPercent}%
            </p>
          </div>
        )}
      </div>

      <section className="no-print space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">분석 기록</h2>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">
            저장된 분석 기록이 없습니다. 보고서를 생성하면 자동으로 저장됩니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                {editingId === record.id ? (
                  <>
                    <input
                      type="text"
                      className="ui-input min-w-0 flex-1 px-3 py-1.5 text-sm"
                      value={editingTitle}
                      maxLength={100}
                      autoFocus
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void renameHistoryRecord(record.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        disabled={historyBusyId === record.id}
                        onClick={() => void renameHistoryRecord(record.id)}
                      >
                        {historyBusyId === record.id ? "저장 중…" : "저장"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {record.school
                          ? `${record.school} · ${record.studentName}`
                          : record.studentName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(record.generatedAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={historyBusyId === record.id}
                        onClick={() => void openHistoryRecord(record.id)}
                      >
                        {historyBusyId === record.id ? "불러오는 중…" : "열람"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={historyBusyId === record.id}
                        onClick={() => startEditingRecord(record)}
                      >
                        제목 수정
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        disabled={historyBusyId === record.id}
                        onClick={() => void deleteHistoryRecord(record.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
