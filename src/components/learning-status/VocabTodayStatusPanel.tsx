"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTodayIsoKorea } from "@/lib/date/korea-today";
import type { VocabTodayStatusTable } from "@/lib/learning-status/types";
import type { ReportClassOption } from "@/lib/reports/types";

const NAME_SEARCH_DEBOUNCE_MS = 400;

interface VocabTodayStatusPanelProps {
  initialClasses?: ReportClassOption[];
}

export function VocabTodayStatusPanel({
  initialClasses = [],
}: VocabTodayStatusPanelProps) {
  const [classes] = useState<ReportClassOption[]>(initialClasses);
  const [classId, setClassId] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [appliedNameQuery, setAppliedNameQuery] = useState("");
  const [dateIso, setDateIso] = useState(getTodayIsoKorea());
  const [onlyStudied, setOnlyStudied] = useState(false);
  const [table, setTable] = useState<VocabTodayStatusTable | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedNameQuery(nameInput.trim());
    }, NAME_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [nameInput]);

  const loadStatus = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateIso) params.set("date", dateIso);
      if (classId) params.set("classId", classId);
      if (appliedNameQuery) params.set("name", appliedNameQuery);

      const res = await fetch(`/api/vocab/status?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (requestId !== requestIdRef.current) return;

      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "현황을 불러오지 못했습니다.");
      }

      setTable(data.table as VocabTodayStatusTable);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      if (requestId === requestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, [appliedNameQuery, classId, dateIso]);

  useEffect(() => {
    void loadStatus();
    return () => abortRef.current?.abort();
  }, [loadStatus]);

  const rows =
    table?.rows.filter((row) => !onlyStudied || row.studiedToday) ?? [];

  const studiedCount = table?.rows.filter((r) => r.studiedToday).length ?? 0;
  const assignedCount = table?.rows.length ?? 0;
  const initialLoading = refreshing && table === null;
  const namePending =
    nameInput.trim() !== appliedNameQuery || (refreshing && !!appliedNameQuery);

  return (
    <section className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-slate-700">
          날짜
          <input
            type="date"
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          반
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block min-w-[140px] rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="">전체</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          학생 검색
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedNameQuery(nameInput.trim());
              }
            }}
            placeholder="이름"
            className="mt-1 block w-40 rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={onlyStudied}
            onChange={(e) => setOnlyStudied(e.target.checked)}
          />
          오늘 학습한 항목만
        </label>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={refreshing}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {refreshing ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {namePending && !initialLoading && (
        <p className="text-xs text-slate-500">검색어를 반영하는 중…</p>
      )}

      {table && (
        <p className="text-sm text-slate-600">
          {table.dateIso} 기준 · 학습함 {studiedCount}건 / 배정 {assignedCount}건
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialLoading && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-32 animate-pulse rounded bg-slate-200" />
        </div>
      )}

      {!initialLoading && rows.length === 0 && (
        <p className="text-sm text-slate-500">
          표시할 항목이 없습니다. 단어세트 배정 후 다시 확인해 주세요.
        </p>
      )}

      {rows.length > 0 && (
        <div className="relative">
          {refreshing && (
            <div
              className="absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-white/60 pt-8"
              aria-hidden
            >
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow ring-1 ring-emerald-100">
                업데이트 중…
              </span>
            </div>
          )}
          <div
            className={`ui-table-wrap transition-opacity ${
              refreshing ? "opacity-70" : "opacity-100"
            }`}
          >
            <table className="ui-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>반</th>
                  <th>학생</th>
                  <th>단어세트</th>
                  <th>오늘 학습</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.studentId}-${row.setId}`}>
                    <td className="text-slate-500">{index + 1}</td>
                    <td>{row.classLabel}</td>
                    <td className="font-medium text-slate-900">
                      {row.studentName}
                    </td>
                    <td>{row.setTitle}</td>
                    <td>{row.activityLabel}</td>
                    <td>
                      {row.studiedToday ? (
                        <span className="font-medium text-emerald-700">
                          학습함
                        </span>
                      ) : (
                        <span className="font-medium text-red-600">미학습</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
