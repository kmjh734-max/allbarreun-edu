"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClass } from "@/app/admin/classes/actions";
import type { Profile } from "@/types/database";

interface CreateClassFormProps {
  teachers: Profile[];
}

export function CreateClassForm({ teachers }: CreateClassFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await createClass({
      name,
      description,
      teacherId: teacherId || undefined,
    });

    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      setLoading(false);
      return;
    }

    if ("classId" in result && result.classId) {
      router.push(`/admin/classes/${result.classId}`);
      return;
    }
    setMessage({ type: "success", text: result.message });
    setName("");
    setDescription("");
    setTeacherId("");
    router.refresh();
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="font-semibold text-slate-900">새 반 만들기</h3>
      <div>
        <label className="mb-1 block text-sm font-medium">반 이름</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 중2 A반"
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
        {loading ? "생성 중..." : "반 만들기"}
      </button>
    </form>
  );
}
