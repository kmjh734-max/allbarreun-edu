import {
  extractVimeoVideoId,
  extractYouTubeVideoId,
  parseVideoLink,
  type VideoProvider,
} from "@/lib/video/parse-url";

export interface LessonVideoSource {
  provider: VideoProvider;
  videoId: string;
  url: string | null;
}

export interface LessonVideoRowInput {
  video_provider: VideoProvider;
  vimeo_url: string | null;
  vimeo_video_id: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
}

type LessonVideoDbRow = {
  video_provider?: string | null;
  vimeo_url?: string | null;
  vimeo_video_id?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
};

export function lessonVideoFieldsFromUrl(
  videoUrl: string
): LessonVideoRowInput | null {
  const trimmed = videoUrl.trim();
  const parsed = parseVideoLink(trimmed);
  if (!parsed) return null;

  if (parsed.provider === "youtube") {
    return {
      video_provider: "youtube",
      vimeo_url: null,
      vimeo_video_id: null,
      youtube_url: trimmed,
      youtube_video_id: parsed.videoId,
    };
  }

  return {
    video_provider: "vimeo",
    vimeo_url: trimmed,
    vimeo_video_id: parsed.videoId,
    youtube_url: null,
    youtube_video_id: null,
  };
}

export function resolveLessonVideo(
  lesson: LessonVideoDbRow
): LessonVideoSource | null {
  const provider: VideoProvider =
    lesson.video_provider === "youtube" || lesson.youtube_video_id
      ? "youtube"
      : "vimeo";

  if (provider === "youtube") {
    const videoId =
      lesson.youtube_video_id ??
      (lesson.youtube_url ? extractYouTubeVideoId(lesson.youtube_url) : null);
    if (!videoId) return null;
    return {
      provider: "youtube",
      videoId,
      url: lesson.youtube_url ?? null,
    };
  }

  const videoId =
    lesson.vimeo_video_id ??
    (lesson.vimeo_url ? extractVimeoVideoId(lesson.vimeo_url) : null);
  if (!videoId) return null;

  return {
    provider: "vimeo",
    videoId,
    url: lesson.vimeo_url ?? null,
  };
}

export function lessonDisplayVideoUrl(lesson: LessonVideoDbRow): string {
  const resolved = resolveLessonVideo(lesson);
  if (resolved?.url) return resolved.url;
  if (resolved?.provider === "youtube") {
    return `https://www.youtube.com/watch?v=${resolved.videoId}`;
  }
  if (resolved?.provider === "vimeo") {
    return `https://vimeo.com/${resolved.videoId}`;
  }
  return "동영상 미등록";
}

export function lessonProviderLabel(lesson: LessonVideoDbRow): string {
  const resolved = resolveLessonVideo(lesson);
  if (!resolved) return "";
  return resolved.provider === "youtube" ? "YouTube" : "Vimeo";
}
