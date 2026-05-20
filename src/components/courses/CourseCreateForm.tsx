"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveLessonTeacherId } from "@/lib/courses/resolve-lesson-teacher-id";
import {
  createEmptyVideoRow,
  ensureDefaultSection,
  getNextLessonOrderIndex,
  validateVideoDraftRows,
  type VideoDraftRow,
} from "@/lib/courses/course-lessons";
import { extractVimeoVideoId } from "@/lib/vimeo/parse-url";
import { VideoListEditor } from "@/components/courses/VideoListEditor";
import type { Profile } from "@/types/database";

interface CourseCreateFormProps {
  teachers?: Profile[];
  /** Logged-in user id (admin or teacher) */
  currentUserId: string;
  variant?: "admin" | "teacher";
}

export function CourseCreateForm({
  teachers = [],
  currentUserId,
  variant = "admin",
}: CourseCreateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [videoRows, setVideoRows] = useState<VideoDraftRow[]>([
    createEmptyVideoRow(),
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!title.trim()) {
      setMessage({ type: "error", text: "강좌 제목을 입력해 주세요." });
      return;
    }

    const videoCheck = validateVideoDraftRows(videoRows);
    if (!videoCheck.ok) {
      setMessage({ type: "error", text: videoCheck.message });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const assignedTeacherId =
      variant === "teacher" ? currentUserId : teacherId || null;

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        teacher_id: assignedTeacherId,
        is_published: isPublished,
      })
      .select("id, teacher_id")
      .single();

    if (courseError || !course) {
      setMessage({
        type: "error",
        text: courseError?.message ?? "강좌 저장에 실패했습니다.",
      });
      setLoading(false);
      return;
    }

    try {
      const sectionId = await ensureDefaultSection(supabase, course.id);
      const lessonTeacherId = resolveLessonTeacherId(
        course.teacher_id,
        currentUserId
      );

      let orderIndex = await getNextLessonOrderIndex(supabase, course.id);

      for (const row of videoRows) {
        const vimeoVideoId = extractVimeoVideoId(row.vimeoUrl)!;
        const { error: lessonError } = await supabase.from("lessons").insert({
          course_id: course.id,
          section_id: sectionId,
          teacher_id: lessonTeacherId,
          title: row.title.trim(),
          description: null,
          vimeo_url: row.vimeoUrl.trim(),
          vimeo_video_id: vimeoVideoId,
          material_url: null,
          order_index: orderIndex,
          is_published: isPublished,
        });

        if (lessonError) {
          setMessage({
            type: "error",
            text: `영상 저장 실패: ${lessonError.message}`,
          });
          setLoading(false);
          return;
        }
        orderIndex += 1;
      }

      setMessage({ type: "success", text: "강좌가 저장되었습니다." });
      const base =
        variant === "teacher" ? "/teacher/courses" : "/admin/courses";
      router.push(`${base}/${course.id}`);
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "영상 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">강좌 정보</h3>
        <div>
          <label className="mb-1 block text-sm font-medium">강좌 제목</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 내공영문법"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">강좌 설명</label>
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
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <VideoListEditor
          rows={videoRows}
          onChange={setVideoRows}
          disabled={loading}
        />
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

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "저장 중..." : "강좌 저장"}
      </button>
    </form>
  );
}
