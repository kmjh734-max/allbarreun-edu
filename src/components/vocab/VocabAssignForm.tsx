"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SearchableTreePicker } from "@/components/ui/SearchableTreePicker";
import type { TreeNode } from "@/lib/ui/tree-types";

interface VocabAssignFormProps {
  setId: string;
  studentTree: TreeNode[];
  classTree: TreeNode[];
  onAssign: (input: {
    setId: string;
    studentId?: string;
    classId?: string;
  }) => Promise<{ ok: boolean; message: string }>;
}

export function VocabAssignForm({
  setId,
  studentTree,
  classTree,
  onAssign,
}: VocabAssignFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"student" | "class">("student");
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await onAssign({
      setId,
      studentId: mode === "student" ? studentId : undefined,
      classId: mode === "class" ? classId : undefined,
    });

    setMessage(result.message);
    setLoading(false);

    if (result.ok) {
      setStudentId("");
      setClassId("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">단어장 배정</h3>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("student")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "student"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          학생
        </button>
        <button
          type="button"
          onClick={() => setMode("class")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "class"
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          반
        </button>
      </div>
      {mode === "student" ? (
        <SearchableTreePicker
          label="학생 선택"
          required
          tree={studentTree}
          value={studentId}
          onChange={setStudentId}
          searchPlaceholder="학생·반 검색"
          emptyLabel="학생 선택"
        />
      ) : (
        <SearchableTreePicker
          label="반 선택"
          required
          tree={classTree}
          value={classId}
          onChange={setClassId}
          searchPlaceholder="반 이름 검색"
          emptyLabel="반 선택"
        />
      )}
      {message && (
        <p
          className={`text-sm ${message.includes("되었") ? "text-green-700" : "text-red-600"}`}
          role="status"
        >
          {message}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "배정 중..." : "배정하기"}
      </Button>
    </form>
  );
}
