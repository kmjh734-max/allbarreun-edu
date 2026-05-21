"use client";

import { buildYouTubeEmbedUrl } from "@/lib/video/parse-url";

interface YouTubeLessonWatchProps {
  videoId: string;
  title: string;
  materialUrl?: string | null;
}

/** YouTube: 단순 임베드만 (시청률·이어보기·건너뛰기 제한 없음) */
export function YouTubeLessonWatch({
  videoId,
  title,
  materialUrl,
}: YouTubeLessonWatchProps) {
  const embedUrl = buildYouTubeEmbedUrl(videoId);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-black shadow-lg">
        <div className="relative aspect-video w-full">
          <iframe
            key={videoId}
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      {materialUrl && (
        <a
          href={materialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          PDF 학습자료 다운로드
        </a>
      )}
    </div>
  );
}
