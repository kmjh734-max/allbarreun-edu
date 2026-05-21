"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAdminApiResponse } from "@/lib/admin/parse-api-response-client";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { Course, Profile } from "@/types/database";

interface TeacherEnrollmentFormProps {
  students: Profile[];
  courses: Course[];
}

export function TeacherEnrollmentForm({
  students,
  courses,
}: TeacherEnrollmentFormProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
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

  if (courses.length === 0) {
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
      <SearchableSelect
        label="학생"
        required
        value={studentId}
        onChange={setStudentId}
        emptyOptionLabel={activeStudents[0] ? "선택" : "학생 없음"}
        searchPlaceholder="학생 이름·아이디 검색"
        options={activeStudents.map((s) => ({
          value: s.id,
          label: `${s.name} (${s.username ?? "—"})`,
          searchText: [s.username, s.name].join(" "),
        }))}
      />
      <SearchableSelect
        label="강좌"
        required
        value={courseId}
        onChange={setCourseId}
        searchPlaceholder="강좌 제목 검색"
        options={courses.map((c) => ({
          value: c.id,
          label: c.title,
          searchText: c.title,
        }))}
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
