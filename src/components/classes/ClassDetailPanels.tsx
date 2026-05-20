"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminAddStudentToClass,
  adminAssignCourseToClass,
  adminRemoveCourseFromClass,
  adminRemoveStudentFromClass,
  updateClass,
} from "@/app/admin/classes/actions";
import {
  teacherAddStudentToClass,
  teacherAssignCourseToClass,
  teacherRemoveCourseFromClass,
  teacherRemoveStudentFromClass,
} from "@/app/teacher/classes/actions";
import type { Course, Profile } from "@/types/database";

export type ClassPanelVariant = "admin" | "teacher";

type Message = { type: "success" | "error"; text: string } | null;

interface ClassInfoPanelProps {
  variant: ClassPanelVariant;
  classId: string;
  initialName: string;
  initialDescription: string;
  initialTeacherId: string;
  initialIsActive: boolean;
  teachers: Profile[];
}

export function ClassInfoPanel({
  variant,
  classId,
  initialName,
  initialDescription,
  initialTeacherId,
  initialIsActive,
  teachers,
}: ClassInfoPanelProps) {
  const canEditInfo = variant === "admin";
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [teacherId, setTeacherId] = useState(initialTeacherId);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEditInfo) return;
    setLoading(true);
    setMessage(null);

    const result = await updateClass(classId, {
      name,
      description,
      teacherId,
      isActive,
    });

    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });
    if (result.ok) router.refresh();
    setLoading(false);
  }

  if (!canEditInfo) {
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">반 이름</dt>
          <dd className="font-medium">{initialName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">담당 강사</dt>
          <dd className="font-medium">
            {teachers.find((t) => t.id === initialTeacherId)?.name ?? "미배정"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">설명</dt>
          <dd>{initialDescription || "설명 없음"}</dd>
        </div>
      </dl>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">반 이름</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">반 설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">담당 강사</label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">선택 안 함</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        반 활성 (비활성 시 학생·강좌 추가 불가)
      </label>
      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "저장 중..." : "반 정보 저장"}
      </button>
    </form>
  );
}

interface ClassStudentsPanelProps {
  variant: ClassPanelVariant;
  classId: string;
  members: Array<{
    id: string;
    student_id: string;
    name: string;
    username: string | null;
  }>;
  studentOptions: Profile[];
}

export function ClassStudentsPanel({
  variant,
  classId,
  members,
  studentOptions,
}: ClassStudentsPanelProps) {
  const router = useRouter();
  const memberIds = new Set(members.map((m) => m.student_id));
  const available = studentOptions.filter(
    (s) => !memberIds.has(s.id) && s.is_active !== false
  );

  const [studentId, setStudentId] = useState(available[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setLoading(true);
    setMessage(null);

    const result =
      variant === "admin"
        ? await adminAddStudentToClass(classId, studentId)
        : await teacherAddStudentToClass(classId, studentId);

    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });
    if (result.ok) {
      setStudentId("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRemove(studentIdToRemove: string, studentName: string) {
    if (
      !window.confirm(
        `「${studentName}」 학생을 이 반에서 제거할까요?\n기존 수강 등록은 유지됩니다.`
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);

    const result =
      variant === "admin"
        ? await adminRemoveStudentFromClass(classId, studentIdToRemove)
        : await teacherRemoveStudentFromClass(classId, studentIdToRemove);

    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });
    if (result.ok) router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium">학생 추가</label>
          {available.length === 0 ? (
            <p className="text-sm text-amber-700">
              추가할 수 있는 학생이 없습니다.
            </p>
          ) : (
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.username ? ` (${s.username})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !studentId || available.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          학생 추가
        </button>
      </form>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {members.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            등록된 학생이 없습니다.
          </li>
        ) : (
          members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                {m.name}
                {m.username ? (
                  <span className="ml-2 text-slate-500">({m.username})</span>
                ) : null}
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRemove(m.student_id, m.name)}
                className="text-red-600 hover:underline disabled:opacity-50"
              >
                제거
              </button>
            </li>
          ))
        )}
      </ul>

      {message && (
        <p
          role="status"
          className={`text-sm ${
            message.type === "success" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

interface ClassCoursesPanelProps {
  variant: ClassPanelVariant;
  classId: string;
  classCourses: Array<{ id: string; course_id: string; title: string }>;
  courseOptions: Course[];
}

export function ClassCoursesPanel({
  variant,
  classId,
  classCourses,
  courseOptions,
}: ClassCoursesPanelProps) {
  const router = useRouter();
  const assignedIds = new Set(classCourses.map((c) => c.course_id));
  const available = courseOptions.filter((c) => !assignedIds.has(c.id));

  const [courseId, setCourseId] = useState(available[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    setLoading(true);
    setMessage(null);

    const result =
      variant === "admin"
        ? await adminAssignCourseToClass(classId, courseId)
        : await teacherAssignCourseToClass(classId, courseId);

    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });
    if (result.ok) {
      setCourseId("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRemove(courseIdToRemove: string, courseTitle: string) {
    if (
      !window.confirm(
        `「${courseTitle}」 강좌를 이 반에서 제거할까요?\n학생의 기존 수강 등록은 유지됩니다.`
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);

    const result =
      variant === "admin"
        ? await adminRemoveCourseFromClass(classId, courseIdToRemove)
        : await teacherRemoveCourseFromClass(classId, courseIdToRemove);

    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });
    if (result.ok) router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAssign}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium">강좌 배정</label>
          {available.length === 0 ? (
            <p className="text-sm text-amber-700">
              배정할 수 있는 강좌가 없습니다.
            </p>
          ) : (
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.is_published ? "" : " (비공개)"}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !courseId || available.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          강좌 배정
        </button>
      </form>
      <p className="text-xs text-slate-500">
        배정 시 반에 속한 모든 학생에게 수강(enrollments)이 자동 등록됩니다.
      </p>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {classCourses.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            배정된 강좌가 없습니다.
          </li>
        ) : (
          classCourses.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium">{c.title}</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRemove(c.course_id, c.title)}
                className="text-red-600 hover:underline disabled:opacity-50"
              >
                제거
              </button>
            </li>
          ))
        )}
      </ul>

      {message && (
        <p
          role="status"
          className={`text-sm ${
            message.type === "success" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
