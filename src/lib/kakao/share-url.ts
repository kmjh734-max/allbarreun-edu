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

export function getExpectedShareHostname(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || SITE_URL;
  try {
    return new URL(site).hostname;
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
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return {
        ok: false,
        warning:
          "localhost 링크는 카카오톡에서 열리지 않습니다. 배포 사이트(https://allbarreun-edu.vercel.app)에서 링크를 다시 생성해 주세요.",
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
        warning: `링크 도메인(${u.hostname})이 사이트 URL(${expected})과 다릅니다. Kakao 제품 링크·NEXT_PUBLIC_SITE_URL을 동일 도메인으로 맞춰 주세요.`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, warning: "공유 URL 형식이 올바르지 않습니다." };
  }
}

export const KAKAO_PRODUCT_LINK_HINT =
  "카카오톡 카드의 링크가 눌리지 않으면 Kakao Developers → 앱 → 제품 링크 관리 → 웹에 배포 도메인(예: https://allbarreun-edu.vercel.app)을 등록해 주세요. (플랫폼 Web 도메인과 별도 설정입니다.)";
