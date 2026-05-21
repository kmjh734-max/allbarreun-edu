"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAdminApiResponse } from "@/lib/admin/parse-api-response-client";
import { SearchableTreePicker } from "@/components/ui/SearchableTreePicker";
import type { TreeNode } from "@/lib/ui/tree-types";
import type { Profile } from "@/types/database";

interface TeacherEnrollmentFormProps {
  students: Profile[];
  studentTree: TreeNode[];
  courseTree: TreeNode[];
}

export function TeacherEnrollmentForm({
  students,
  studentTree,
  courseTree,
}: TeacherEnrollmentFormProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const activeStudents = students.filter((s) => s.is_active !== false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !courseId) return;

    setLoading(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      const res = await fetch("/api/teacher/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, course_id: courseId }),
      });

      const data = await parseAdminApiResponse(res);

      if (!res.ok || !data.ok) {
        setMessage(data.message ?? "배정에 실패했습니다.");
        setIsSuccess(false);
        return;
      }

      setMessage(data.message ?? "강좌이 학생에게 배정되었습니다.");
      setIsSuccess(true);
      router.refresh();
    } catch (err) {
      console.error("TeacherEnrollmentForm error:", err);
      setMessage("네트워크 오류가 발생했습니다.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  if (activeStudents.length === 0) {
    return (
      <p className="text-sm text-amber-700">
        강좌을 배정하려면 먼저 학생을 등록해 주세요.
      </p>
    );
  }

  if (courseTree.length === 0) {
    return (
      <p className="text-sm text-amber-700">
        담당 강좌이 없습니다. 관리자에게 강좌 배정을 요청해 주세요.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="font-semibold">담당 강좌 배정</h3>
      <p className="text-sm text-slate-600">
        본인이 등록한 학생을 담당 강좌에 배정합니다.
      </p>
      <SearchableTreePicker
        label="학생"
        required
        tree={studentTree}
        value={studentId}
        onChange={setStudentId}
        searchPlaceholder="학생·반 이름 검색"
        emptyLabel="학생 선택"
      />
      <SearchableTreePicker
        label="강좌"
        required
        tree={courseTree}
        value={courseId}
        onChange={setCourseId}
        searchPlaceholder="강좌 제목 검색"
        emptyLabel="강좌 선택"
      />
      {message && (
        <p
          className={`text-sm ${isSuccess ? "text-green-700" : "text-red-600"}`}
          role="status"
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "배정 중..." : "배정하기"}
      </button>
    </form>
  );
}
