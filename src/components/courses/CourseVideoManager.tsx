"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createEmptyVideoRow,
  ensureDefaultSection,
  getNextLessonOrderIndex,
  validateVideoDraftRows,
  type VideoDraftRow,
} from "@/lib/courses/course-lessons";
import { extractVimeoVideoId } from "@/lib/vimeo/parse-url";
import { VideoListEditor } from "@/components/courses/VideoListEditor";
import type { Lesson } from "@/types/database";

interface CourseVideoManagerProps {
  courseId: string;
  teacherId: string;
  courseIsPublished: boolean;
  lessons: Lesson[];
}

type Message = { type: "success" | "error"; text: string } | null;

export function CourseVideoManager({
  courseId,
  teacherId,
  courseIsPublished,
  lessons: initialLessons,
}: CourseVideoManagerProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initialLessons);

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editVimeoUrl, setEditVimeoUrl] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [newRows, setNewRows] = useState<VideoDraftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  /** Parent passes lessons in display order (flattened across sections). */
  const displayLessons = lessons;

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditVimeoUrl(lesson.vimeo_url ?? "");
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
    if (!editVimeoUrl.trim()) {
      setMessage({ type: "error", text: "Vimeo 주소를 입력해 주세요." });
      return;
    }
    const vimeoVideoId = extractVimeoVideoId(editVimeoUrl);
    if (!vimeoVideoId) {
      setMessage({
        type: "error",
        text: "Vimeo 주소가 올바르지 않습니다. 링크를 확인해 주세요.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("lessons")
      .update({
        title: editTitle.trim(),
        vimeo_url: editVimeoUrl.trim(),
        vimeo_video_id: vimeoVideoId,
        is_published: editPublished,
      })
      .eq("id", lessonId)
      .select("*")
      .single();

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? (data as Lesson) : l))
    );
    setEditingId(null);
    setMessage({ type: "success", text: "영상이 수정되었습니다." });
    setLoading(false);
    router.refresh();
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
    const supabase = createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
    if (editingId === lesson.id) setEditingId(null);
    setMessage({ type: "success", text: "영상이 삭제되었습니다." });
    setLoading(false);
    router.refresh();
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
    const supabase = createClient();

    try {
      const sectionId = await ensureDefaultSection(supabase, courseId);
      let orderIndex = await getNextLessonOrderIndex(supabase, courseId);
      const inserted: Lesson[] = [];

      for (const row of newRows) {
        const vimeoVideoId = extractVimeoVideoId(row.vimeoUrl)!;
        const { data, error } = await supabase
          .from("lessons")
          .insert({
            course_id: courseId,
            section_id: sectionId,
            teacher_id: teacherId,
            title: row.title.trim(),
            description: null,
            vimeo_url: row.vimeoUrl.trim(),
            vimeo_video_id: vimeoVideoId,
            material_url: null,
            order_index: orderIndex,
            is_published: courseIsPublished,
          })
          .select("*")
          .single();

        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
        inserted.push(data as Lesson);
        orderIndex += 1;
      }

      setLessons((prev) => [...prev, ...inserted]);
      setNewRows([]);
      setMessage({ type: "success", text: "새 영상이 추가되었습니다." });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "영상 추가 중 오류가 발생했습니다.",
      });
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
                        Vimeo 주소
                      </label>
                      <input
                        value={editVimeoUrl}
                        onChange={(e) => setEditVimeoUrl(e.target.value)}
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
                    {lesson.vimeo_url ?? "Vimeo 미등록"}
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
