export type VideoProvider = "vimeo" | "youtube";

export interface ParsedVideoLink {
  provider: VideoProvider;
  videoId: string;
}

/**
 * Extract Vimeo video ID from various URL formats.
 */
export function extractVimeoVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /vimeo\.com\/(?:video\/)?(\d+)/i,
    /player\.vimeo\.com\/video\/(\d+)/i,
    /vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/)(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^\d+$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Extract YouTube video ID from share / embed URLs.
 */
export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);

    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const v = parsed.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        return /^[\w-]{11}$/.test(parts[embedIdx + 1])
          ? parts[embedIdx + 1]
          : null;
      }
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) {
        return /^[\w-]{11}$/.test(parts[shortsIdx + 1])
          ? parts[shortsIdx + 1]
          : null;
      }
      const liveIdx = parts.indexOf("live");
      if (liveIdx >= 0 && parts[liveIdx + 1]) {
        return /^[\w-]{11}$/.test(parts[liveIdx + 1])
          ? parts[liveIdx + 1]
          : null;
      }
    }
  } catch {
    /* fall through to regex */
  }

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([\w-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  return null;
}

/** 저장·표시용: si= 등 추적 파라미터 제거, YouTube는 watch?v= 형식으로 통일 */
export function normalizeVideoInputUrl(url: string): string {
  const trimmed = url.trim();
  const parsed = parseVideoLink(trimmed);
  if (!parsed) return trimmed;
  if (parsed.provider === "youtube") {
    return `https://www.youtube.com/watch?v=${parsed.videoId}`;
  }
  return trimmed;
}

export function parseVideoLink(url: string): ParsedVideoLink | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("youtube-nocookie.com") ||
    /^[\w-]{11}$/.test(trimmed)
  ) {
    const videoId = extractYouTubeVideoId(trimmed);
    if (videoId) return { provider: "youtube", videoId };
  }

  const vimeoId = extractVimeoVideoId(trimmed);
  if (vimeoId) return { provider: "vimeo", videoId: vimeoId };

  return null;
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  startSeconds?: number,
  options?: { enableJsApi?: boolean }
): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (options?.enableJsApi) {
    params.set("enablejsapi", "1");
  }
  const start = Math.max(0, Math.floor(startSeconds ?? 0));
  if (start > 0) {
    params.set("start", String(start));
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function buildVimeoEmbedUrl(
  videoId: string,
  startSeconds?: number
): string {
  const params = new URLSearchParams({
    api: "1",
    title: "0",
    byline: "0",
    portrait: "0",
  });
  const base = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
  const start = Math.max(0, Math.floor(startSeconds ?? 0));
  if (start > 0) {
    return `${base}#t=${start}s`;
  }
  return base;
}

export const VIDEO_LINK_PLACEHOLDER =
  "https://www.youtube.com/watch?v=... 또는 https://vimeo.com/123456789";

export const VIDEO_LINK_HELP =
  "YouTube·Vimeo 공유 링크를 붙여 넣어 주세요. YouTube는 「공개」가 가장 안정적입니다. 「일부 공개」는 LMS에 안 뜰 수 있어, 그때는 YouTube에서 직접 시청하거나 영상을 공개로 바꿔 주세요.";
