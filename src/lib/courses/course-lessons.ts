import type { SupabaseClient } from "@supabase/supabase-js";
import { extractVimeoVideoId } from "@/lib/vimeo/parse-url";
import type { Lesson, Section } from "@/types/database";

export const DEFAULT_SECTION_TITLE = "전체 강의";

export interface VideoDraftRow {
  title: string;
  vimeoUrl: string;
}

export function createEmptyVideoRow(): VideoDraftRow {
  return { title: "", vimeoUrl: "" };
}

export function validateVideoDraftRows(
  rows: VideoDraftRow[]
): { ok: true } | { ok: false; message: string } {
  if (rows.length === 0) {
    return { ok: false, message: "영상을 1개 이상 추가해 주세요." };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 1;
    if (!row.title.trim()) {
      return { ok: false, message: `${n}번 영상 제목을 입력해 주세요.` };
    }
    if (!row.vimeoUrl.trim()) {
      return { ok: false, message: `${n}번 Vimeo 주소를 입력해 주세요.` };
    }
    if (!extractVimeoVideoId(row.vimeoUrl)) {
      return {
        ok: false,
        message: `${n}번 Vimeo 주소가 올바르지 않습니다. 링크를 확인해 주세요.`,
      };
    }
  }

  return { ok: true };
}

/** Sort sections, then lessons within each section; append orphan lessons. */
export function flattenCourseLessons(
  sections: Section[],
  lessons: Lesson[]
): Lesson[] {
  const sortedSections = [...sections].sort(
    (a, b) => a.order_index - b.order_index
  );
  const sectionIds = new Set(sortedSections.map((s) => s.id));
  const result: Lesson[] = [];

  for (const section of sortedSections) {
    const sectionLessons = lessons
      .filter((l) => l.section_id === section.id)
      .sort((a, b) => a.order_index - b.order_index);
    result.push(...sectionLessons);
  }

  const orphans = lessons
    .filter((l) => !sectionIds.has(l.section_id))
    .sort((a, b) => a.order_index - b.order_index);
  result.push(...orphans);

  return result;
}

export async function ensureDefaultSection(
  supabase: SupabaseClient,
  courseId: string
): Promise<string> {
  const { data: sections, error: fetchError } = await supabase
    .from("sections")
    .select("id, title, order_index")
    .eq("course_id", courseId)
    .order("order_index");

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (sections && sections.length > 0) {
    const preferred = sections.find((s) => s.title === DEFAULT_SECTION_TITLE);
    return (preferred ?? sections[0]).id;
  }

  const { data: created, error: insertError } = await supabase
    .from("sections")
    .insert({
      course_id: courseId,
      title: DEFAULT_SECTION_TITLE,
      order_index: 1,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "기본 단원을 생성할 수 없습니다.");
  }

  return created.id;
}

export async function getNextLessonOrderIndex(
  supabase: SupabaseClient,
  courseId: string
): Promise<number> {
  const { data } = await supabase
    .from("lessons")
    .select("order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.order_index ?? 0) + 1;
}
