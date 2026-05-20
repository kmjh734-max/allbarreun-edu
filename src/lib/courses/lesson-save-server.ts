import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureDefaultSection,
  getNextLessonOrderIndex,
  validateVideoDraftRows,
  type VideoDraftRow,
} from "@/lib/courses/course-lessons";
import { withLessonVideoPayload } from "@/lib/video/lesson-persist";
import type { Lesson } from "@/types/database";

export async function insertCourseLessons(
  db: SupabaseClient,
  courseId: string,
  teacherId: string,
  rows: VideoDraftRow[]
): Promise<{ ok: true; lessons: Lesson[] } | { ok: false; message: string }> {
  const videoCheck = validateVideoDraftRows(rows);
  if (!videoCheck.ok) {
    return { ok: false, message: videoCheck.message };
  }

  try {
    const sectionId = await ensureDefaultSection(db, courseId);
    let orderIndex = await getNextLessonOrderIndex(db, courseId);
    const inserted: Lesson[] = [];

    for (const row of rows) {
      const videoResult = await withLessonVideoPayload(
        row.videoUrl,
        async (videoPayload) => {
          const { data, error } = await db
            .from("lessons")
            .insert({
              course_id: courseId,
              section_id: sectionId,
              teacher_id: teacherId,
              title: row.title.trim(),
              description: null,
              ...videoPayload,
              material_url: null,
              order_index: orderIndex,
              is_published: true,
            })
            .select("*")
            .single();
          return { data, error };
        }
      );

      if (!videoResult.ok) {
        return { ok: false, message: videoResult.message };
      }

      inserted.push(videoResult.data as Lesson);
      orderIndex += 1;
    }

    return { ok: true, lessons: inserted };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "영상 저장 중 오류가 발생했습니다.",
    };
  }
}

export async function updateCourseLesson(
  db: SupabaseClient,
  lessonId: string,
  courseId: string,
  input: { title: string; videoUrl: string; isPublished: boolean }
): Promise<{ ok: true; lesson: Lesson } | { ok: false; message: string }> {
  const videoResult = await withLessonVideoPayload(
    input.videoUrl,
    async (videoPayload) => {
      const { data, error } = await db
        .from("lessons")
        .update({
          title: input.title.trim(),
          ...videoPayload,
          is_published: input.isPublished,
        })
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .select("*")
        .single();
      return { data, error };
    }
  );

  if (!videoResult.ok) {
    return { ok: false, message: videoResult.message };
  }

  return { ok: true, lesson: videoResult.data as Lesson };
}

export async function deleteCourseLesson(
  db: SupabaseClient,
  lessonId: string,
  courseId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await db
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("course_id", courseId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
