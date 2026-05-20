"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Course, Profile } from "@/types/database";

interface CourseSettingsFormProps {
  course: Course;
  variant: "admin" | "teacher";
  teachers?: Profile[];
  listHref: string;
}

export function CourseSettingsForm({
  course,
  variant,
  teachers = [],
  listHref,
}: CourseSettingsFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [teacherId, setTeacherId] = useState(course.teacher_id ?? "");
  const [isPublished, setIsPublished] = useState(course.is_published);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const payload: {
      title: string;
      description: string | null;
      is_published: boolean;
      teacher_id?: string | null;
    } = {
      title: title.trim(),
      description: description.trim() || null,
      is_published: isPublished,
    };

    if (variant === "admin") {
      payload.teacher_id = teacherId || null;
    }

    const { error: updateError } = await supabase
      .from("courses")
      .update(payload)
      .eq("id", course.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `「${course.title}」 강좌를 삭제할까요?\n\n등록된 모든 영상, 수강 배정, 학습 진도 기록이 함께 삭제되며 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", course.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push(listHref);
    router.refresh();
  }

  const busy = loading || deleting;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">강좌명</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {variant === "admin" && (
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
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          강좌 공개 (학생에게 표시)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "저장 중..." : "강좌 정보 저장"}
        </button>
      </form>

      <div className="max-w-lg rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h4 className="text-sm font-semibold text-red-900">강좌 삭제</h4>
        <p className="mt-1 text-sm text-red-800/90">
          강좌와 포함된 모든 영상·수강·진도 데이터가 영구 삭제됩니다.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleDelete}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "강좌 삭제"}
        </button>
      </div>
    </div>
  );
}
