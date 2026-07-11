"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";

type JobRow = {
  id: string;
  status: string;
  progress_message: string | null;
  total_requested: number;
  total_completed: number;
  total_failed: number;
  created_at: string;
  english_source_passages?: { title?: string } | null;
  request_config?: {
    title?: string;
    passages?: Array<{ text?: string }>;
    passageIds?: string[];
    passage?: string;
    grade?: string;
  };
};

function statusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case "completed":
      return {
        label: "제작 완료",
        className: "bg-slate-800 text-white",
      };
    case "partially_completed":
      return {
        label: "일부 완료",
        className: "bg-amber-700 text-white",
      };
    case "failed":
      return {
        label: "실패",
        className: "bg-red-600 text-white",
      };
    case "pending":
      return {
        label: "처리 전",
        className: "bg-slate-400 text-white",
      };
    case "analyzing":
    case "generating":
    case "validating":
      return {
        label: "생성 중",
        className: "bg-brand-700 text-white",
      };
    default:
      return {
        label: status,
        className: "bg-slate-400 text-white",
      };
  }
}

function passageCount(j: JobRow): number {
  const ids = j.request_config?.passageIds;
  if (Array.isArray(ids) && ids.length > 0) return ids.length;
  const list = j.request_config?.passages;
  if (Array.isArray(list)) {
    const n = list.filter((p) => (p.text ?? "").trim()).length;
    if (n > 0) return n;
  }
  if ((j.request_config?.passage ?? "").trim()) return 1;
  return 1;
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

function viewHref(basePath: string, j: JobRow): string {
  const noResults =
    (j.status === "pending" || j.status === "failed") &&
    (j.total_completed ?? 0) === 0;
  if (noResults) {
    return `${basePath}/new?fromJob=${encodeURIComponent(j.id)}`;
  }
  // 제목 클릭 → 세부 정보 대신 종합 문제 PDF 화면
  if ((j.total_completed ?? 0) > 0) {
    return `${basePath}/generations/${j.id}/print?mode=exam`;
  }
  return `${basePath}/generations/${j.id}`;
}

export function GenerationsListClient({ basePath }: { basePath: string }) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/question-generator/jobs");
      const d = await res.json();
      if (!d.ok) setError(d.message);
      else {
        setJobs(d.jobs ?? []);
        setSelected(new Set());
      }
    } catch {
      setError("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allSelected =
    jobs.length > 0 && jobs.every((j) => selected.has(j.id));

  const selectedCount = useMemo(() => selected.size, [selected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(jobs.map((j) => j.id)));
  }

  async function copySelected(ids: string[]) {
    if (ids.length === 0) {
      setError("복사할 항목을 선택해 주세요.");
      return;
    }
    if (ids.length > 5) {
      setError("한 번에 최대 5개까지 복사할 수 있습니다.");
      return;
    }
    if (
      !window.confirm(
        `선택한 ${ids.length}개 자료를 복사할까요? (생성은 시작하지 않습니다)`
      )
    ) {
      return;
    }
    setCopying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/question-generator/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyFromIds: ids }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "복사에 실패했습니다.");
        return;
      }
      setMessage(
        `${data.copied}개 자료를 복사했습니다. 「보기」에서 확인 후 생성하면 그 자료에 바로 만들어집니다.`
      );
      await load();
    } catch {
      setError("복사 요청에 실패했습니다.");
    } finally {
      setCopying(false);
    }
  }

  async function regenerateSelected(ids: string[]) {
    if (ids.length === 0) {
      setError("재생성할 항목을 선택해 주세요.");
      return;
    }
    if (ids.length > 5) {
      setError("한 번에 최대 5개까지 재생성할 수 있습니다.");
      return;
    }
    if (
      !window.confirm(
        `선택한 ${ids.length}개 자료를 다시 생성할까요? 기존 문항은 지워지고 새로 만들어집니다.`
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError(null);
    setMessage(null);
    try {
      for (const id of ids) {
        void fetch(`/api/question-generator/jobs/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retry" }),
        });
      }
      setMessage(
        `${ids.length}개 자료 재생성을 시작했습니다. 목록에서 진행 상태를 확인하세요.`
      );
      window.setTimeout(() => void load(), 1000);
    } catch {
      setError("재생성 요청에 실패했습니다.");
    } finally {
      setRegenerating(false);
    }
  }

  async function deleteSelected() {
    if (selectedCount === 0) {
      setError("삭제할 항목을 선택해 주세요.");
      return;
    }
    if (
      !window.confirm(
        `선택한 ${selectedCount}개 자료를 삭제할까요? 관련 문항도 함께 삭제됩니다.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/question-generator/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "삭제에 실패했습니다.");
        return;
      }
      setMessage(`${data.deleted}개 자료를 삭제했습니다.`);
      await load();
    } catch {
      setError("삭제 요청에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="영어 변형문제"
        description="만든 변형문제 자료를 모은 폴더입니다. 새로 만들기로 지문을 넣고 문제를 생성하세요."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${basePath}/new`}
              className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              + 새로 만들기
            </Link>
            <button
              type="button"
              disabled={
                copying || regenerating || deleting || selectedCount === 0
              }
              onClick={() => void copySelected(Array.from(selected))}
              className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copying ? "복사 중…" : "선택 복사"}
            </button>
            <button
              type="button"
              disabled={
                copying || regenerating || deleting || selectedCount === 0
              }
              onClick={() => void regenerateSelected(Array.from(selected))}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {regenerating ? "재생성 중…" : "선택 재생성"}
            </button>
            <button
              type="button"
              disabled={
                deleting || copying || regenerating || selectedCount === 0
              }
              onClick={() => void deleteSelected()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleting ? "삭제 중…" : "선택삭제"}
            </button>
          </div>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <span className="border-b-2 border-brand-700 px-3 py-2 text-sm font-semibold text-brand-800">
          내 자료
        </span>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {message && (
        <div className="mb-4">
          <Alert variant="success">{message}</Alert>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="ui-table w-full text-sm [&_th]:px-2.5 [&_th]:py-2 [&_td]:px-2.5 [&_td]:py-2">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="w-16">#</th>
              <th>제목</th>
              <th className="w-16 whitespace-nowrap">지문</th>
              <th className="w-20 whitespace-nowrap">문항</th>
              <th className="w-24">상태</th>
              <th className="w-28 whitespace-nowrap">작성일</th>
              <th className="w-44"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading &&
              jobs.map((j) => {
                const st = statusMeta(j.status);
                const title =
                  j.request_config?.title ||
                  j.english_source_passages?.title ||
                  "무제";
                const checked = selected.has(j.id);
                return (
                  <tr
                    key={j.id}
                    className={`hover:bg-slate-50/80 ${
                      checked ? "bg-brand-50/40" : ""
                    }`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(j.id)}
                        aria-label={`${title} 선택`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="font-mono text-xs text-slate-500">
                      {shortId(j.id)}
                    </td>
                    <td className="max-w-[14rem] truncate sm:max-w-xs">
                      <Link
                        href={viewHref(basePath, j)}
                        className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                      >
                        {title}
                      </Link>
                      {j.request_config?.grade && (
                        <span className="ml-1.5 text-xs text-slate-400">
                          {j.request_config.grade}
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums">{passageCount(j)}</td>
                    <td className="tabular-nums text-slate-700">
                      {j.total_completed}/{j.total_requested}
                      {j.total_failed > 0 ? (
                        <span className="ml-1 text-xs text-red-600">
                          실패 {j.total_failed}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {new Date(j.created_at).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <button
                          type="button"
                          disabled={copying || regenerating || deleting}
                          onClick={() => void copySelected([j.id])}
                          className="text-xs text-slate-600 hover:underline disabled:opacity-40"
                        >
                          복사
                        </button>
                        <button
                          type="button"
                          disabled={
                            copying ||
                            regenerating ||
                            deleting ||
                            ["analyzing", "generating", "validating"].includes(
                              j.status
                            )
                          }
                          onClick={() => void regenerateSelected([j.id])}
                          className="text-xs text-amber-800 hover:underline disabled:opacity-40"
                        >
                          재생성
                        </button>
                        {(j.status === "completed" ||
                          j.status === "partially_completed") &&
                          j.total_completed > 0 && (
                            <>
                              <Link
                                href={`${basePath}/generations/${j.id}/print?mode=exam`}
                                className="text-xs text-slate-600 hover:underline"
                              >
                                문제
                              </Link>
                              <Link
                                href={`${basePath}/generations/${j.id}/print?mode=answers`}
                                className="text-xs text-slate-600 hover:underline"
                              >
                                해설
                              </Link>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <p className="mb-3">아직 만든 변형문제가 없습니다.</p>
                  <Link
                    href={`${basePath}/new`}
                    className="inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white"
                  >
                    + 새로 만들기
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
