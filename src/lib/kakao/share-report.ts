import { LOGO_SRC } from "@/lib/branding";
import {
  ensureKakaoSdkReady,
  isKakaoShareConfigured,
  loadKakaoSdk,
} from "@/lib/kakao/kakao-init";
import { buildKakaoPasteMessage } from "@/lib/kakao/paste-message";
import {
  KAKAO_PRODUCT_LINK_HINT,
  normalizeShareUrl,
  validateShareUrlForKakao,
} from "@/lib/kakao/share-url";

export {
  ensureKakaoSdkReady,
  isKakaoShareConfigured,
  loadKakaoSdk as loadKakaoSdkForReports,
} from "@/lib/kakao/kakao-init";

export function getAbsoluteLogoUrl(shareUrl: string): string {
  try {
    const origin = new URL(shareUrl).origin;
    return `${origin}${LOGO_SRC}`;
  } catch {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${LOGO_SRC}`;
    }
    return "";
  }
}

export interface KakaoShareParams {
  studentName: string;
  periodLabel: string;
  shareUrl: string;
  feedTitle?: string;
  feedDescription?: string;
  buttonTitle?: string;
  pasteMessage?: string;
}

export type KakaoShareResult =
  | { ok: true; method: "text" | "scrap" | "feed" }
  | { ok: false; fallback: true; message: string }
  | { ok: false; fallback: false; message: string };

export { buildKakaoPasteMessage, KAKAO_PRODUCT_LINK_HINT, validateShareUrlForKakao };

/** 카카오톡 채팅에 붙여넣기용 (링크가 일반 URL로 인식되어 항상 탭 가능) */
export async function copyKakaoPasteMessage(
  params: KakaoShareParams
): Promise<{ ok: boolean; message: string }> {
  const shareUrl = normalizeShareUrl(params.shareUrl);
  const text = buildKakaoPasteMessage({ ...params, shareUrl });
  try {
    await navigator.clipboard.writeText(text);
    return {
      ok: true,
      message:
        "카카오톡에 붙여넣을 메시지를 복사했습니다. 채팅창에 붙여넣으면 링크를 눌러 열 수 있습니다.",
    };
  } catch {
    return { ok: false, message: "메시지 복사에 실패했습니다." };
  }
}

function buildTextPayload(params: KakaoShareParams): Record<string, unknown> {
  const shareUrl = normalizeShareUrl(params.shareUrl);
  const text =
    params.pasteMessage ??
    buildKakaoPasteMessage({ ...params, shareUrl });
  return {
    objectType: "text",
    text,
    link: {
      mobileWebUrl: shareUrl,
      webUrl: shareUrl,
    },
  };
}

function buildFeedPayload(
  params: KakaoShareParams,
  includeImage: boolean
): Record<string, unknown> {
  const { studentName, periodLabel } = params;
  const shareUrl = normalizeShareUrl(params.shareUrl);
  const title = params.feedTitle ?? `${studentName} 학생 학습 리포트`;
  const description =
    params.feedDescription ?? `${periodLabel} 온라인 학습 현황 리포트입니다.`;

  const content: Record<string, unknown> = {
    title,
    description,
    link: {
      mobileWebUrl: shareUrl,
      webUrl: shareUrl,
    },
  };

  if (includeImage) {
    const imageUrl = getAbsoluteLogoUrl(shareUrl);
    if (imageUrl) {
      content.imageUrl = imageUrl;
    }
  }

  return {
    objectType: "feed",
    content,
    buttons: [
      {
        title: params.buttonTitle ?? "리포트 보기",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  };
}

function formatKakaoShareError(error: unknown): string | null {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!text) return null;
  if (text.includes("4019")) {
    return `카카오 공유 오류(4019): JavaScript 키와 Web 도메인 등록을 확인해 주세요. ${KAKAO_PRODUCT_LINK_HINT}`;
  }
  return text;
}

function trySend(fn: () => void): { ok: true } | { ok: false; error?: unknown } {
  try {
    fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * 카카오톡 공유 — text(본문 URL) → scrap → feed 순으로 시도.
 */
export async function shareReportViaKakao(
  params: KakaoShareParams
): Promise<KakaoShareResult> {
  const shareUrl = normalizeShareUrl(params.shareUrl);
  const validation = validateShareUrlForKakao(shareUrl);
  if (!validation.ok && validation.warning) {
    return { ok: false, fallback: false, message: validation.warning };
  }

  if (!isKakaoShareConfigured()) {
    return {
      ok: false,
      fallback: false,
      message:
        "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY(자바스크립트 키)가 설정되어 있지 않습니다.",
    };
  }

  const ready = await ensureKakaoSdkReady();
  if (!ready.ok) {
    return copyFallback(shareUrl, `${ready.message} 리포트 링크를 복사했습니다.`);
  }

  const kakao = window.Kakao!;

  const textResult = trySend(() =>
    kakao.Share.sendDefault(buildTextPayload(params))
  );
  if (textResult.ok) {
    return { ok: true, method: "text" };
  }
  const textErr = formatKakaoShareError(textResult.error);
  if (textErr) {
    return { ok: false, fallback: false, message: textErr };
  }

  const scrapResult = trySend(() =>
    kakao.Share.sendScrap({ requestUrl: shareUrl })
  );
  if (scrapResult.ok) {
    return { ok: true, method: "scrap" };
  }

  const feedImageResult = trySend(() =>
    kakao.Share.sendDefault(buildFeedPayload(params, true))
  );
  if (feedImageResult.ok) {
    return { ok: true, method: "feed" };
  }

  const feedResult = trySend(() =>
    kakao.Share.sendDefault(buildFeedPayload(params, false))
  );
  if (feedResult.ok) {
    return { ok: true, method: "feed" };
  }

  const feedErr = formatKakaoShareError(feedImageResult.error ?? feedResult.error);
  if (feedErr) {
    return { ok: false, fallback: false, message: feedErr };
  }

  return copyFallback(
    shareUrl,
    `카카오톡보내기를 사용할 수 없어 리포트 링크를 복사했습니다. ${KAKAO_PRODUCT_LINK_HINT}`
  );
}

async function copyFallback(
  shareUrl: string,
  message: string
): Promise<KakaoShareResult> {
  try {
    await navigator.clipboard.writeText(shareUrl);
    return { ok: false, fallback: true, message };
  } catch {
    return {
      ok: false,
      fallback: false,
      message: "카카오톡 공유와 링크 복사에 실패했습니다.",
    };
  }
}
