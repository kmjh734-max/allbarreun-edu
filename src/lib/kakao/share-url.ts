import { SITE_URL } from "@/lib/branding";

/** 배포·카카오 공유용 HTTPS URL 정규화 */
export function normalizeShareUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
      u.protocol = "https:";
    }
    return u.href;
  } catch {
    return url;
  }
}

export function getPublicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (fromEnv || SITE_URL).replace(/\/$/, "");
}

export function getExpectedShareHostname(): string | null {
  try {
    return new URL(getPublicSiteUrl()).hostname;
  } catch {
    return null;
  }
}

export type ShareUrlValidation = {
  ok: boolean;
  warning?: string;
};

/** 카카오톡에서 열 수 있는 공개 링크인지 점검 */
export function validateShareUrlForKakao(url: string): ShareUrlValidation {
  const siteUrl = getPublicSiteUrl();

  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return {
        ok: false,
        warning: `localhost 링크는 카카오톡에서 열리지 않습니다. 배포 사이트(${siteUrl})에서 링크를 다시 생성해 주세요.`,
      };
    }
    if (u.protocol !== "https:") {
      return {
        ok: false,
        warning: "카카오톡 공유 링크는 HTTPS여야 합니다.",
      };
    }
    const expected = getExpectedShareHostname();
    if (expected && u.hostname !== expected) {
      return {
        ok: false,
        warning: `링크 도메인(${u.hostname})이 NEXT_PUBLIC_SITE_URL(${expected})과 다릅니다. Kakao 제품 링크·플랫폼 Web 도메인을 동일하게 맞춰 주세요.`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, warning: "공유 URL 형식이 올바르지 않습니다." };
  }
}

export const KAKAO_PRODUCT_LINK_HINT = `카카오톡 공유(4019 등) 오류 시: Kakao Developers → 앱 → 플랫폼 → Web 사이트 도메인 + 제품 링크 관리 → 웹에 ${getPublicSiteUrl()} 을 등록하고, JavaScript 키를 NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY 로 설정하세요.`;
