"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignEnrollment } from "@/app/admin/students/actions";
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
      <div>
        <label className="mb-1 block text-sm font-medium">학생</label>
        <select
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">선택</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.email})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">강좌</label>
        <select
          required
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">선택</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
              {!c.is_published ? " (비공개)" : ""}
            </option>
          ))}
        </select>
      </div>
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
