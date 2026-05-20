"use client";

import { useMemo, useState } from "react";
import {
  formatLastStudiedDate,
  formatStudyDateTime,
  formatWatchedDuration,
  matchesStudentSearch,
  type EnrollmentProgressRow,
} from "@/lib/progress/enrollment-progress";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface EnrollmentProgressDetailTableProps {
  rows: EnrollmentProgressRow[];
  emptyMessage?: string;
}

function rowKey(row: EnrollmentProgressRow): string {
  return `${row.studentId}-${row.courseId}`;
}

export function EnrollmentProgressDetailTable({
  rows,
  emptyMessage = "아직 수강 현황이 없습니다.",
}: EnrollmentProgressDetailTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");

  const courseOptions = useMemo(() => {
    const titles = new Map<string, string>();
    for (const row of rows) {
      titles.set(row.courseId, row.courseTitle);
    }
    return Array.from(titles.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "ko")
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (courseFilter !== "all") {
      list = list.filter((r) => r.courseId === courseFilter);
    }
    if (studentSearch.trim()) {
      list = list.filter((r) => matchesStudentSearch(r, studentSearch));
    }
    return list;
  }, [rows, courseFilter, studentSearch]);

  const uniqueStudentCount = useMemo(() => {
    const ids = new Set(filteredRows.map((r) => r.studentId));
    return ids.size;
  }, [filteredRows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const hasActiveFilter =
    studentSearch.trim().length > 0 || courseFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="ui-section-card flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end !p-4">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="student-progress-search"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            학생 검색
          </label>
          <div className="relative">
            <input
              id="student-progress-search"
              type="search"
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setExpandedKey(null);
              }}
              placeholder="이름 또는 이메일로 검색"
              className="ui-input pr-9"
              autoComplete="off"
            />
            {studentSearch && (
              <button
                type="button"
                onClick={() => {
                  setStudentSearch("");
                  setExpandedKey(null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="검색어 지우기"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {courseOptions.length > 1 && (
          <div>
            <label
              htmlFor="student-progress-course"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              강좌 필터
            </label>
            <select
              id="student-progress-course"
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setExpandedKey(null);
              }}
              className="ui-select min-w-[160px] sm:w-auto"
            >
              <option value="all">전체 강좌</option>
              {courseOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-sm text-slate-600 sm:pb-2">
          {hasActiveFilter ? (
            <>
              학생 <strong>{uniqueStudentCount}</strong>명 · 수강{" "}
              <strong>{filteredRows.length}</strong>건
            </>
          ) : (
            <>
              전체 학생 <strong>{uniqueStudentCount}</strong>명 · 수강{" "}
              <strong>{filteredRows.length}</strong>건
            </>
          )}
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
          {hasActiveFilter
            ? "검색·필터 조건에 맞는 수강 현황이 없습니다."
            : emptyMessage}
        </div>
      ) : (
      <div className="ui-table-wrap">
        <table className="ui-table min-w-[800px]">
          <thead>
            <tr>
              <th className="w-10 px-3 py-3" aria-label="펼치기" />
              <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                학생
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                강좌
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-700">
                영상
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-700">
                완료
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                진행률
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                마지막 학습
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const key = rowKey(row);
              const isOpen = expandedKey === key;

              return (
                <LessonProgressRowGroup
                  key={key}
                  row={row}
                  isOpen={isOpen}
                  onToggle={() =>
                    setExpandedKey(isOpen ? null : key)
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <p className="text-xs text-slate-500">
        학생 이름으로 검색한 뒤 행을 클릭하면 영상별 시청률·시청 시간·학습 일시를
        확인할 수 있습니다.
      </p>
    </div>
  );
}

function LessonProgressRowGroup({
  row,
  isOpen,
  onToggle,
}: {
  row: EnrollmentProgressRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50/80"
        onClick={onToggle}
      >
        <td className="px-3 py-3 text-center text-slate-400">
          <span
            className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
          {row.studentName}
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            {row.studentEmail}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-800">{row.courseTitle}</td>
        <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
          {row.totalLessons}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
          {row.completedLessons}
        </td>
        <td className="min-w-[140px] whitespace-nowrap px-4 py-3">
          <ProgressBar percent={row.progressPercent} size="sm" />
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
          {formatLastStudiedDate(row.lastStudiedAt)}
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={8} className="px-4 py-4">
            {row.lessons.length === 0 ? (
              <p className="text-sm text-slate-500">
                공개된 영상이 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">순서</th>
                      <th className="px-3 py-2 font-medium">영상 제목</th>
                      <th className="px-3 py-2 text-center font-medium">
                        시청률
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        누적 시청
                      </th>
                      <th className="px-3 py-2 font-medium">마지막 시청</th>
                      <th className="px-3 py-2 font-medium">완료 일시</th>
                      <th className="px-3 py-2 text-center font-medium">
                        완료
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.lessons.map((lesson) => (
                      <tr
                        key={lesson.lessonId}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {lesson.orderIndex}강
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {lesson.lessonTitle}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  lesson.isCompleted
                                    ? "bg-green-500"
                                    : "bg-brand-500"
                                }`}
                                style={{
                                  width: `${lesson.progressPercent}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {lesson.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-center text-slate-600">
                          {formatWatchedDuration(lesson.watchedSeconds)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {formatStudyDateTime(lesson.lastWatchedAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {formatStudyDateTime(lesson.completedAt)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {lesson.isCompleted ? (
                            <Badge variant="success">완료</Badge>
                          ) : lesson.progressPercent > 0 ? (
                            <Badge variant="warning">진행 중</Badge>
                          ) : (
                            <Badge variant="neutral">미시청</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
