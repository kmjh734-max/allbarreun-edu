"use client";

import { extractVimeoVideoId, buildVimeoEmbedUrl } from "@/lib/vimeo/parse-url";

interface VimeoPlayerProps {
  vimeoUrl?: string | null;
  vimeoVideoId?: string | null;
  title?: string;
}

export function VimeoPlayer({ vimeoUrl, vimeoVideoId, title }: VimeoPlayerProps) {
  const videoId =
    vimeoVideoId ?? (vimeoUrl ? extractVimeoVideoId(vimeoUrl) : null);

  if (!videoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        등록된 동영상이 없습니다.
      </div>
    );
  }

  const embedUrl = buildVimeoEmbedUrl(videoId);

  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-lg">
      <div className="relative aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title ?? "강의 영상"}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
