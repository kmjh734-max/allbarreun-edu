"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { removeEnrollment } from "@/app/admin/students/actions";
import { parseAdminApiResponse } from "@/lib/admin/parse-api-response-client";
import { matchesSearch } from "@/lib/ui/filter-by-search";

export interface EnrollmentListRow {
  id: string;
  studentName: string;
  courseTitle: string;
  createdAt: string;
}

interface EnrollmentListProps {
  rows: EnrollmentListRow[];
  /** 관리자: server action, 강사: API DELETE */
  variant: "admin" | "teacher";
}

export function EnrollmentList({ rows, variant }: EnrollmentListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        matchesSearch(query, row.studentName, row.courseTitle)
      ),
    [rows, query]
  );

  async function handleRemove(row: EnrollmentListRow) {
    if (
      !window.confirm(
        `「${row.studentName}」 학생의 「${row.courseTitle}」 수강 배정을 해제할까요?\n학생 화면에서 해당 강좌가 사라집니다. (학습 진도 기록은 유지됩니다.)`
      )
    ) {
      return;
    }

    setLoadingId(row.id);
    setMessage(null);

    try {
      if (variant === "admin") {
        const result = await removeEnrollment(row.id);
        if (!result.ok) {
          setMessage({ type: "error", text: result.message });
          return;
        }
        setMessage({ type: "success", text: result.message });
      } else {
        const res = await fetch(
          `/api/teacher/enrollments?id=${encodeURIComponent(row.id)}`,
          { method: "DELETE" }
        );
        const data = await parseAdminApiResponse(res);
        if (!res.ok || !data.ok) {
          setMessage({
            type: "error",
            text: data.message ?? "배정 해제에 실패했습니다.",
          });
          return;
        }
        setMessage({
          type: "success",
          text: data.message ?? "수강 배정이 해제되었습니다.",
        });
      }
      router.refresh();
    } catch (err) {
      console.error("handleRemove enrollment:", err);
      setMessage({ type: "error", text: "배정 해제 중 오류가 발생했습니다." });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="학생·강좌 이름으로 검색"
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
        autoComplete="off"
      />

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-700" : "text-red-600"
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">학생</th>
              <th className="px-4 py-3 font-medium">강좌</th>
              <th className="px-4 py-3 font-medium">배정일</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  배정 내역이 없습니다.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3">{row.studentName}</td>
                  <td className="px-4 py-3">{row.courseTitle}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(row.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={loadingId === row.id}
                      onClick={() => handleRemove(row)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                    >
                      {loadingId === row.id ? "해제 중..." : "배정 해제"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
