import {
  lessonVideoFieldsFromUrl,
  type LessonVideoRowInput,
} from "@/lib/video/lesson-fields";

export const LESSON_VIDEO_MIGRATION_HINT =
  " Supabase SQL Editor에서 supabase/FIX_LESSON_YOUTUBE.sql 을 실행해 주세요.";

export function isLessonVideoSchemaError(message: string | undefined): boolean {
  const m = message ?? "";
  if (
    (m.includes("video_provider") ||
      m.includes("youtube_url") ||
      m.includes("youtube_video_id")) &&
    (m.includes("schema cache") || m.includes("Could not find"))
  ) {
    return true;
  }
  return (
    (m.includes("youtube") || m.includes("video_provider")) &&
    (m.includes("column") ||
      m.includes("schema") ||
      m.includes("Could not find") ||
      m.includes("does not exist"))
  );
}

/** DB에 YouTube 컬럼이 없을 때 Vimeo 전용 저장용 */
export function lessonVideoFieldsVimeoOnly(
  fields: LessonVideoRowInput
): { vimeo_url: string; vimeo_video_id: string } | null {
  if (fields.video_provider !== "vimeo" || !fields.vimeo_url || !fields.vimeo_video_id) {
    return null;
  }
  return {
    vimeo_url: fields.vimeo_url,
    vimeo_video_id: fields.vimeo_video_id,
  };
}

/**
 * YouTube 컬럼이 없는 DB: 링크·ID를 vimeo_url / vimeo_video_id 에 저장.
 * 재생 시 resolveLessonVideo 가 URL에서 YouTube 로 인식합니다.
 */
export function lessonVideoFieldsLegacyStorage(
  fields: LessonVideoRowInput
): { vimeo_url: string; vimeo_video_id: string } | null {
  if (
    fields.video_provider === "youtube" &&
    fields.youtube_url &&
    fields.youtube_video_id
  ) {
    return {
      vimeo_url: fields.youtube_url,
      vimeo_video_id: fields.youtube_video_id,
    };
  }
  return lessonVideoFieldsVimeoOnly(fields);
}

type ApplyResult<T> = {
  data?: T;
  error: { message: string } | null;
};

/**
 * lessons insert/update 시 video_provider 등 스키마 미적용 DB면 Vimeo 필드만 재시도.
 */
export async function withLessonVideoPayload<T>(
  videoUrl: string,
  apply: (videoPayload: Record<string, unknown>) => Promise<ApplyResult<T>>
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const fields = lessonVideoFieldsFromUrl(videoUrl);
  if (!fields) {
    return {
      ok: false,
      message:
        "동영상 링크가 올바르지 않습니다. YouTube 또는 Vimeo 링크를 확인해 주세요.",
    };
  }

  let result = await apply({ ...fields });

  if (!result.error) {
    return { ok: true, data: result.data as T };
  }

  if (!isLessonVideoSchemaError(result.error.message)) {
    return { ok: false, message: result.error.message };
  }

  const legacy = lessonVideoFieldsLegacyStorage(fields);
  if (!legacy) {
    return {
      ok: false,
      message:
        "YouTube 영상을 등록하려면 Supabase에서 마이그레이션(FIX_LESSON_YOUTUBE.sql)이 필요합니다." +
        LESSON_VIDEO_MIGRATION_HINT,
    };
  }

  result = await apply({ ...legacy });
  if (result.error) {
    const hint = isLessonVideoSchemaError(result.error.message)
      ? LESSON_VIDEO_MIGRATION_HINT
      : "";
    return { ok: false, message: result.error.message + hint };
  }

  return { ok: true, data: result.data as T };
}
