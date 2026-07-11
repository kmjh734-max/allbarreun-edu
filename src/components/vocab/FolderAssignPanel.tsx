"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const fieldClass =
  "w-full min-h-[3rem] rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-2 block text-base font-semibold text-slate-800";

export interface ClassWithStudents {
  id: string;
  name: string;
  students: { id: string; name: string }[];
}

export interface FolderAssignmentRow {
  id: string;
  set_id: string;
  student_id: string;
  class_id: string;
  set_title: string;
  student_name: string;
  class_name: string;
}

interface FolderAssignPanelProps {
  folderId: string;
  setCount: number;
  classes: ClassWithStudents[];
  assignments: FolderAssignmentRow[];
  onAssignToClass: (
    folderId: string,
    classId: string
  ) => Promise<{ ok: boolean; message: string }>;
  onAssignToStudents: (
    folderId: string,
    classId: string,
    studentIds: string[]
  ) => Promise<{ ok: boolean; message: string }>;
  onRemoveAssignment: (
    assignmentId: string,
    folderId: string
  ) => Promise<{ ok: boolean; message: string }>;
}

export function FolderAssignPanel({
  folderId,
  setCount,
  classes,
  assignments,
  onAssignToClass,
  onAssignToStudents,
  onRemoveAssignment,
}: FolderAssignPanelProps) {
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [pickStudentId, setPickStudentId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const students = selectedClass?.students ?? [];

  const allStudents = useMemo(
    () =>
      classes.flatMap((c) =>
        c.students.map((s) => ({
          ...s,
          classId: c.id,
          className: c.name,
        }))
      ),
    [classes]
  );

  const groupedAssignments = useMemo(() => {
    const map = new Map<
      string,
      {
        student_id: string;
        student_name: string;
        class_name: string;
        items: FolderAssignmentRow[];
      }
    >();
    for (const a of assignments) {
      const key = `${a.student_id}:${a.class_id}`;
      const entry = map.get(key) ?? {
        student_id: a.student_id,
        student_name: a.student_name,
        class_name: a.class_name,
        items: [],
      };
      entry.items.push(a);
      map.set(key, entry);
    }
    return [...map.values()];
  }, [assignments]);

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId);
    setPickStudentId("");
    setSelectedStudents(new Set());
  }

  function handlePickStudentByName(studentId: string) {
    setPickStudentId(studentId);
    if (!studentId) return;
    const found = allStudents.find((s) => s.id === studentId);
    if (found) {
      setClassId(found.classId);
      setSelectedStudents(new Set([found.id]));
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllStudents() {
    setSelectedStudents(new Set(students.map((s) => s.id)));
  }

  function clearStudentSelection() {
    setSelectedStudents(new Set());
    setPickStudentId("");
  }

  async function handleAssignClass() {
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    const result = await onAssignToClass(folderId, classId);
    setMessage(result.message);
    if (result.ok) router.refresh();
    setLoading(false);
  }

  async function handleAssignStudents() {
    if (!classId || selectedStudents.size === 0) return;
    setLoading(true);
    setMessage(null);
    const result = await onAssignToStudents(folderId, classId, [
      ...selectedStudents,
    ]);
    setMessage(result.message);
    if (result.ok) {
      setSelectedStudents(new Set());
      setPickStudentId("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRemove(assignmentId: string) {
    if (!confirm("이 배정을 해제할까요?")) return;
    setLoading(true);
    const result = await onRemoveAssignment(assignmentId, folderId);
    setMessage(result.message);
    if (result.ok) router.refresh();
    setLoading(false);
  }

  if (setCount === 0) {
    return (
      <p className="text-base text-slate-500">
        이 폴더에 단어장이 없어 배정할 수 없습니다. 위에서 단어세트를 먼저
        만드세요.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-base text-slate-600">
        이 폴더의 단어장 <strong>{setCount}개</strong>를 반 또는 학생에게
        배정합니다. 배정된 학생만 단어 학습 메뉴에서 볼 수 있습니다.
      </p>

      {classes.length === 0 ? (
        <p className="text-base text-amber-700">
          등록된 반이 없습니다. 반 관리에서 반을 먼저 만드세요.
        </p>
      ) : (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50/40 p-6 sm:p-8">
          <h3 className="text-lg font-bold text-slate-900">단어장 배정</h3>
          <p className="mt-2 text-base text-slate-600">
            <strong>반 선택</strong>과 <strong>학생 선택</strong>을 함께
            사용할 수 있습니다.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <label className={labelClass}>1. 반 선택</label>
              <select
                className={fieldClass}
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">반을 선택하세요</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (학생 {c.students.length}명)
                  </option>
                ))}
              </select>
              {classId && (
                <Button
                  type="button"
                  className="mt-4 w-full sm:w-auto"
                  disabled={loading || students.length === 0}
                  onClick={handleAssignClass}
                >
                  {loading ? "배정 중..." : "선택한 반 전체에 배정"}
                </Button>
              )}
            </div>

            <div>
              <label className={labelClass}>2. 학생 이름으로 선택</label>
              <select
                className={fieldClass}
                value={pickStudentId}
                onChange={(e) => handlePickStudentByName(e.target.value)}
              >
                <option value="">학생 이름을 선택하세요</option>
                {allStudents.map((s) => (
                  <option key={`${s.classId}-${s.id}`} value={s.id}>
                    {s.name} · {s.className}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">
                학생을 고르면 해당 반이 자동으로 선택됩니다.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className={labelClass}>3. 학생 여러 명 선택 (체크)</label>
              {classId && students.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={selectAllStudents}
                  >
                    전체 선택
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearStudentSelection}
                  >
                    선택 해제
                  </Button>
                </div>
              )}
            </div>

            {!classId ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-base text-slate-500">
                반을 선택하거나, 위에서 학생 이름을 선택하면 학생 목록이
                표시됩니다.
              </p>
            ) : students.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-base text-amber-800">
                이 반에 등록된 학생이 없습니다. 반 관리에서 학생을 추가하세요.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((s) => {
                  const checked = selectedStudents.has(s.id);
                  return (
                    <li key={s.id}>
                      <label
                        className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
                          checked
                            ? "border-violet-500 bg-violet-50"
                            : "border-slate-200 bg-white hover:border-violet-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                          className="h-5 w-5 shrink-0 rounded border-slate-300"
                        />
                        <span className="text-base font-medium text-slate-900">
                          {s.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {classId && selectedStudents.size > 0 && (
              <Button
                type="button"
                className="mt-5 w-full sm:w-auto"
                disabled={loading}
                onClick={handleAssignStudents}
              >
                {loading
                  ? "배정 중..."
                  : `선택한 학생 ${selectedStudents.size}명에게 배정`}
              </Button>
            )}
          </div>
        </div>
      )}

      {message && (
        <p className="text-base text-slate-700" role="status">
          {message}
        </p>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-900">배정 현황</h3>
        {groupedAssignments.length === 0 ? (
          <p className="mt-2 text-base text-slate-500">
            아직 배정된 학생이 없습니다.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {groupedAssignments.map((group) => (
              <li
                key={`${group.student_id}-${group.class_name}`}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <p className="text-base font-semibold text-slate-900">
                  {group.student_name}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {group.class_name}
                  </span>
                </p>
                <ul className="mt-3 space-y-2">
                  {group.items.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 text-base"
                    >
                      <span className="text-slate-800">{a.set_title}</span>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
