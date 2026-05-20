import {
  extractVimeoVideoId,
  extractYouTubeVideoId,
  normalizeVideoInputUrl,
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

  const normalized = normalizeVideoInputUrl(trimmed);

  if (parsed.provider === "youtube") {
    return {
      video_provider: "youtube",
      vimeo_url: null,
      vimeo_video_id: null,
      youtube_url: normalized,
      youtube_video_id: parsed.videoId,
    };
  }

  return {
    video_provider: "vimeo",
    vimeo_url: normalized,
    vimeo_video_id: parsed.videoId,
    youtube_url: null,
    youtube_video_id: null,
  };
}

export function resolveLessonVideo(
  lesson: LessonVideoDbRow
): LessonVideoSource | null {
  const candidateUrls = [
    lesson.youtube_url,
    lesson.vimeo_url,
  ].filter((u): u is string => Boolean(u?.trim()));

  for (const url of candidateUrls) {
    const parsed = parseVideoLink(url);
    if (parsed) {
      return {
        provider: parsed.provider,
        videoId: parsed.videoId,
        url,
      };
    }
  }

  if (lesson.vimeo_video_id?.trim()) {
    const idFromVimeoCol = extractYouTubeVideoId(lesson.vimeo_video_id);
    if (idFromVimeoCol) {
      return {
        provider: "youtube",
        videoId: idFromVimeoCol,
        url: lesson.vimeo_url ?? `https://www.youtube.com/watch?v=${idFromVimeoCol}`,
      };
    }
  }

  const provider: VideoProvider =
    lesson.video_provider === "youtube" ||
    lesson.youtube_video_id ||
    (lesson.vimeo_url &&
      (lesson.vimeo_url.includes("youtube") || lesson.vimeo_url.includes("youtu.be")))
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
