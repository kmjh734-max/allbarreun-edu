/**
 * Extract Vimeo video ID from various URL formats.
 * Examples:
 * - https://vimeo.com/123456789
 * - https://player.vimeo.com/video/123456789
 * - https://vimeo.com/channels/staffpicks/123456789
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
