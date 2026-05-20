"use client";

import { buildVimeoEmbedUrl } from "@/lib/video/parse-url";
import { resolveLessonVideo } from "@/lib/video/lesson-fields";

interface VimeoPlayerProps {
  vimeoUrl?: string | null;
  vimeoVideoId?: string | null;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  videoProvider?: string | null;
  title?: string;
}

function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function VimeoPlayer({
  vimeoUrl,
  vimeoVideoId,
  youtubeUrl,
  youtubeVideoId,
  videoProvider,
  title,
}: VimeoPlayerProps) {
  const resolved = resolveLessonVideo({
    video_provider: videoProvider,
    vimeo_url: vimeoUrl,
    vimeo_video_id: vimeoVideoId,
    youtube_url: youtubeUrl,
    youtube_video_id: youtubeVideoId,
  });

  if (!resolved) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        등록된 동영상이 없습니다.
      </div>
    );
  }

  const embedUrl =
    resolved.provider === "youtube"
      ? buildYouTubeEmbedUrl(resolved.videoId)
      : buildVimeoEmbedUrl(resolved.videoId);

  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-lg">
      <div className="relative aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title ?? "강의 영상"}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}
