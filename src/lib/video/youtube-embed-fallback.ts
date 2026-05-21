import { buildYouTubeEmbedUrl } from "@/lib/video/parse-url";

/** 임베드 불가 시 단순 재생용 (진도 API 없음) */
export function youtubePlainEmbedUrl(
  videoId: string,
  startSeconds?: number
): string {
  return buildYouTubeEmbedUrl(videoId, startSeconds);
}

/** YouTube IFrame API 오류: 업로더가 외부 임베드 비허용 */
export function isYouTubeEmbedBlockedError(code: number): boolean {
  return code === 101 || code === 150 || code === 153;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

