"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEmptyVideoRow,
  validateVideoDraftRows,
  type VideoDraftRow,
} from "@/lib/courses/course-lessons";
import {
  lessonDisplayVideoUrl,
  lessonProviderLabel,
} from "@/lib/video/lesson-fields";
import { VideoListEditor } from "@/components/courses/VideoListEditor";
import type { Lesson } from "@/types/database";

interface CourseVideoManagerProps {
  courseId: string;
  teacherId: string;
  lessons: Lesson[];
  /** admin: 서버 API로 저장(RLS 우회), teacher: 담당 강좌만 */
  apiVariant: "admin" | "teacher";
}

type Message = { type: "success" | "error"; text: string } | null;

function lessonsApiBase(variant: "admin" | "teacher", courseId: string) {
  return `/api/${variant}/courses/${courseId}/lessons`;
}

export function CourseVideoManager({
  courseId,
  teacherId,
  lessons: initialLessons,
  apiVariant,
}: CourseVideoManagerProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [newRows, setNewRows] = useState<VideoDraftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const displayLessons = lessons;

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditVideoUrl(lesson.youtube_url ?? lesson.vimeo_url ?? "");
    setEditPublished(lesson.is_published);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(lessonId: string) {
    if (!editTitle.trim()) {
      setMessage({ type: "error", text: "동영상 제목을 입력해 주세요." });
      return;
    }
    if (!editVideoUrl.trim()) {
      setMessage({ type: "error", text: "동영상 링크를 입력해 주세요." });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `${lessonsApiBase(apiVariant, courseId)}/${lessonId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle.trim(),
            videoUrl: editVideoUrl.trim(),
            isPublished: editPublished,
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        lesson?: Lesson;
      };

      if (!res.ok || !data.ok || !data.lesson) {
        setMessage({
          type: "error",
          text: data.message ?? "영상 수정에 실패했습니다.",
        });
        setLoading(false);
        return;
      }

      setLessons((prev) =>
        prev.map((l) => (l.id === lessonId ? data.lesson! : l))
      );
      setEditingId(null);
      setMessage({ type: "success", text: "영상이 수정되었습니다." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "영상 수정 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function deleteLesson(lesson: Lesson, index: number) {
    if (
      !window.confirm(
        `${index + 1}번 「${lesson.title}」 영상을 삭제할까요?\n진도 기록도 함께 삭제됩니다.`
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `${lessonsApiBase(apiVariant, courseId)}/${lesson.id}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.message ?? "영상 삭제에 실패했습니다.",
        });
        setLoading(false);
        return;
      }

      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
      if (editingId === lesson.id) setEditingId(null);
      setMessage({ type: "success", text: "영상이 삭제되었습니다." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "영상 삭제 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function saveNewVideos() {
    if (newRows.length === 0) return;

    const videoCheck = validateVideoDraftRows(newRows);
    if (!videoCheck.ok) {
      setMessage({ type: "error", text: videoCheck.message });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(lessonsApiBase(apiVariant, courseId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          rows: newRows,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        lessons?: Lesson[];
      };

      if (!res.ok || !data.ok || !data.lessons?.length) {
        setMessage({
          type: "error",
          text: data.message ?? "영상 저장에 실패했습니다.",
        });
        setLoading(false);
        return;
      }

      setLessons((prev) => [...prev, ...data.lessons!]);
      setNewRows([]);
      setMessage({ type: "success", text: "새 영상이 추가되었습니다." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "영상 추가 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-900">영상 목록</h3>
        <p className="mt-1 text-sm text-slate-600">
          번호 순서대로 학생 화면에 표시됩니다.
        </p>
      </div>

      {displayLessons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          등록된 영상이 없습니다. 아래에서 영상을 추가하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {displayLessons.map((lesson, index) => {
            const isEditing = editingId === lesson.id;

            if (isEditing) {
              return (
                <li
                  key={lesson.id}
                  className="rounded-xl border border-brand-200 bg-brand-50/40 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      영상 수정
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        동영상 제목
                      </label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        동영상 링크
                      </label>
                      <input
                        value={editVideoUrl}
                        onChange={(e) => setEditVideoUrl(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editPublished}
                      onChange={(e) => setEditPublished(e.target.checked)}
                    />
                    학생에게 공개
                  </label>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveEdit(lesson.id)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={cancelEdit}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      취소
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={lesson.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{lesson.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {lessonDisplayVideoUrl(lesson)}
                    {lessonProviderLabel(lesson)
                      ? ` · ${lessonProviderLabel(lesson)}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    lesson.is_published
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {lesson.is_published ? "공개" : "비공개"}
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => startEdit(lesson)}
                    className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => deleteLesson(lesson, index)}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <VideoListEditor
          rows={newRows.length > 0 ? newRows : []}
          onChange={setNewRows}
          disabled={loading}
        />
        {newRows.length === 0 && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setNewRows([createEmptyVideoRow()])}
            className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            + 영상 추가
          </button>
        )}
        {newRows.length > 0 && (
          <button
            type="button"
            disabled={loading}
            onClick={saveNewVideos}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "저장 중..." : "새 영상 저장"}
          </button>
        )}
      </div>

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
