import { randomBytes } from "crypto";
import { SITE_URL } from "@/lib/branding";

/** URL-safe 예측 불가능 토큰 */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * 공유 링크 절대 URL 베이스
 * NEXT_PUBLIC_SITE_URL → SITE_URL(academyConfig) 순. 요청 Host 로는 만들지 않음.
 */
export function resolveShareBaseUrl(_request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return SITE_URL.replace(/\/$/, "");
}

export function buildShareUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? resolveShareBaseUrl()).replace(/\/$/, "");
  return `${base}/report/share/${token}`;
}

export function shareExpiresAt(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
