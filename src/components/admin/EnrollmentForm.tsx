"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignEnrollment } from "@/app/admin/students/actions";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { Course, Profile } from "@/types/database";

interface EnrollmentFormProps {
  students: Profile[];
  courses: Course[];
}

export function EnrollmentForm({ students, courses }: EnrollmentFormProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !courseId) return;

    setLoading(true);
    setMessage(null);
    setIsSuccess(false);

    const result = await assignEnrollment(studentId, courseId);

    setMessage(result.message);
    setIsSuccess(result.ok);

    if (result.ok) {
      setStudentId("");
      setCourseId("");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="font-semibold">학생에게 강좌 배정</h3>
      <SearchableSelect
        label="학생"
        required
        value={studentId}
        onChange={setStudentId}
        searchPlaceholder="학생 이름·아이디 검색"
        options={students.map((s) => ({
          value: s.id,
          label: `${s.name} (${s.username ?? s.email})`,
          searchText: [s.username, s.email, s.name].join(" "),
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
          label: `${c.title}${!c.is_published ? " (비공개)" : ""}`,
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
