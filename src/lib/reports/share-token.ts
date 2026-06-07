import { randomBytes } from "crypto";
import { SITE_URL } from "@/lib/branding";

/** URL-safe 예측 불가능 토큰 */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/** 공유 링크 절대 URL (배포 도메인 우선, 없으면 요청 origin) */
export function resolveShareBaseUrl(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (request) {
    const origin = request.headers.get("origin")?.trim();
    if (origin) return origin.replace(/\/$/, "");

    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }

  return SITE_URL.replace(/\/$/, "");
}

export function buildShareUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? SITE_URL).replace(/\/$/, "");
  return `${base}/report/share/${token}`;
}

export function shareExpiresAt(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
