"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export interface VocabSetOption {
  id: string;
  title: string;
  folder_name: string | null;
}

export interface StudentVocabAssignment {
  id: string;
  set_id: string;
  title: string;
}

export interface ClassStudentVocabRow {
  student_id: string;
  name: string;
  assignments: StudentVocabAssignment[];
}

interface ClassVocabPanelProps {
  classId: string;
  students: ClassStudentVocabRow[];
  setOptions: VocabSetOption[];
  onAssign: (
    classId: string,
    studentId: string,
    setId: string
  ) => Promise<{ ok: boolean; message: string }>;
  onRemove: (
    assignmentId: string,
    classId: string
  ) => Promise<{ ok: boolean; message: string }>;
}

export function ClassVocabPanel({
  classId,
  students,
  setOptions,
  onAssign,
  onRemove,
}: ClassVocabPanelProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [setId, setSetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.student_id === studentId);
  const assignedSetIds = new Set(
    selectedStudent?.assignments.map((a) => a.set_id) ?? []
  );
  const availableSets = setOptions.filter((s) => !assignedSetIds.has(s.id));

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !setId) return;
    setLoading(true);
    setMessage(null);
    const result = await onAssign(classId, studentId, setId);
    setMessage(result.message);
    if (result.ok) {
      setSetId("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRemove(assignmentId: string) {
    if (!confirm("이 학생의 단어장 배정을 해제할까요?")) return;
    setLoading(true);
    const result = await onRemove(assignmentId, classId);
    setMessage(result.message);
    if (result.ok) router.refresh();
    setLoading(false);
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        반에 등록된 학생이 없습니다. 학생 관리에서 먼저 학생을 추가하세요.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        학생마다 단어장을 개별 배정합니다. 배정된 단어장만 해당 학생의 단어
        학습 메뉴에 표시됩니다.
      </p>

      <form
        onSubmit={handleAssign}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="min-w-[140px] flex-1">
          <label className="ui-label">학생</label>
          <select
            className="ui-select"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setSetId("");
            }}
            required
          >
            <option value="">학생 선택</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-[2]">
          <label className="ui-label">단어장</label>
          <select
            className="ui-select"
            value={setId}
            onChange={(e) => setSetId(e.target.value)}
            required
            disabled={!studentId}
          >
            <option value="">단어장 선택</option>
            {availableSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.folder_name ? `[${s.folder_name}] ` : ""}
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          disabled={
            loading || !studentId || !setId || availableSets.length === 0
          }
        >
          {loading ? "배정 중..." : "배정"}
        </Button>
      </form>

      {studentId && availableSets.length === 0 && setOptions.length > 0 && (
        <p className="text-sm text-amber-700">
          선택한 학생에게 배정 가능한 단어장이 없습니다.
        </p>
      )}

      {setOptions.length === 0 && (
        <p className="text-sm text-slate-500">
          단어 관리 → 폴더에서 단어장을 먼저 만드세요.
        </p>
      )}

      {message && (
        <p className="text-sm text-slate-600" role="status">
          {message}
        </p>
      )}

      <div className="space-y-3">
        {students.map((student) => (
          <div
            key={student.student_id}
            className="rounded-lg border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 px-4 py-2.5">
              <span className="font-medium text-slate-900">{student.name}</span>
              <span className="ml-2 text-xs text-slate-500">
                {student.assignments.length}개 단어장
              </span>
            </div>
            {student.assignments.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">
                배정된 단어장 없음
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {student.assignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="text-slate-800">{a.title}</span>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleRemove(a.id)}
                    >
                      해제
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
