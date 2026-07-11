"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Profile, VocabSet } from "@/types/database";

interface VocabSetManagePanelProps {
  set: VocabSet;
  role: "admin" | "teacher";
  teachers?: Profile[];
  onUpdate: (
    setId: string,
    input: {
      title?: string;
      description?: string;
      teacherId?: string | null;
    }
  ) => Promise<{ ok: boolean; message: string }>;
  onDelete: (
    setId: string,
    folderId?: string | null
  ) => Promise<{ ok: boolean; message: string }>;
  listHref: string;
}

export function VocabSetManagePanel({
  set,
  role,
  teachers = [],
  onUpdate,
  onDelete,
  listHref,
}: VocabSetManagePanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description ?? "");
  const [teacherId, setTeacherId] = useState(set.teacher_id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await onUpdate(set.id, {
      title,
      description,
      teacherId: role === "admin" ? teacherId || null : undefined,
    });

    setMessage(result.message);
    setLoading(false);
    if (result.ok) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("이 단어장을 삭제할까요? 단어와 배정 정보도 함께 삭제됩니다.")) {
      return;
    }
    setLoading(true);
    const result = await onDelete(set.id, set.folder_id);
    setMessage(result.message);
    setLoading(false);
    if (result.ok) router.push(listHref);
  }

  return (
    <form onSubmit={handleSave} className="ui-section-card space-y-4">
      <h2 className="font-semibold text-slate-900">단어장 설정</h2>
      <div>
        <label className="ui-label">제목</label>
        <input
          className="ui-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="ui-label">설명</label>
        <textarea
          className="ui-input min-h-[72px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {role === "admin" && (
        <div>
          <label className="ui-label">담당 강사</label>
          <select
            className="ui-select"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">미지정</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {message && (
        <p className="text-sm text-slate-600" role="status">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          저장
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={loading}
          onClick={handleDelete}
        >
          삭제
        </Button>
      </div>
    </form>
  );
}
