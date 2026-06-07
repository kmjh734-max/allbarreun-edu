import { LOGO_SRC } from "@/lib/branding";
import { buildKakaoPasteMessage } from "@/lib/kakao/paste-message";
import {
  KAKAO_PRODUCT_LINK_HINT,
  normalizeShareUrl,
  validateShareUrlForKakao,
} from "@/lib/kakao/share-url";

export const KAKAO_SDK_URL =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

type KakaoShareApi = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (settings: Record<string, unknown>) => void;
    sendScrap: (settings: { requestUrl: string }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoShareApi;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

export function isKakaoShareConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim());
}

function getAbsoluteLogoUrl(shareUrl: string): string {
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

/** 리포트 화면 마운트 시 SDK 미리 로드 (선택) */
export function loadKakaoSdkForReports(): Promise<void> {
  return loadKakaoSdk();
}

function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("browser only"));
  }
  if (window.Kakao?.isInitialized?.()) return Promise.resolve();
  if (window.Kakao) return Promise.resolve();

  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${KAKAO_SDK_URL}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => {
        existing.setAttribute("data-loaded", "true");
        resolve();
      });
      existing.addEventListener("error", () =>
        reject(new Error("sdk load failed"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = () => reject(new Error("sdk load failed"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function ensureKakaoInit(): boolean {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!key || !window.Kakao) return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return window.Kakao.isInitialized();
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

function trySend(
  fn: () => void
): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * 카카오톡 공유 — text(본문 URL) → scrap → feed 순으로 시도.
 * feed 카드만 도착하고 링크가 안 눌리면 제품 링크 관리(Web) 도메인 등록 필요.
 */
export async function shareReportViaKakao(
  params: KakaoShareParams
): Promise<KakaoShareResult> {
  const shareUrl = normalizeShareUrl(params.shareUrl);
  const validation = validateShareUrlForKakao(shareUrl);
  if (!validation.ok && validation.warning) {
    return { ok: false, fallback: false, message: validation.warning };
  }

  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      fallback: false,
      message: "카카오 JavaScript 키가 설정되어 있지 않습니다.",
    };
  }

  try {
    await loadKakaoSdk();
    if (!ensureKakaoInit()) {
      return copyFallback(
        shareUrl,
        "카카오 SDK 초기화에 실패했습니다. 리포트 링크를 복사했습니다."
      );
    }

    const kakao = window.Kakao!;

    // 1) 텍스트 메시지 — 본문에 URL 포함 (제품 링크 미등록 시에도 URL 탭 가능한 경우 많음)
    if (trySend(() => kakao.Share.sendDefault(buildTextPayload(params)))) {
      return { ok: true, method: "text" };
    }

    // 2) 스크랩 — OG 메타 기반 (공개 페이지에 og 태그 필요)
    if (
      trySend(() =>
        kakao.Share.sendScrap({ requestUrl: shareUrl })
      )
    ) {
      return { ok: true, method: "scrap" };
    }

    // 3) 피드 카드 (제품 링크 등록 시 카드·버튼 링크 활성화)
    if (trySend(() => kakao.Share.sendDefault(buildFeedPayload(params, true)))) {
      return { ok: true, method: "feed" };
    }
    if (trySend(() => kakao.Share.sendDefault(buildFeedPayload(params, false)))) {
      return { ok: true, method: "feed" };
    }

    return copyFallback(
      shareUrl,
      `카카오톡보내기를 사용할 수 없어 리포트 링크를 복사했습니다. ${KAKAO_PRODUCT_LINK_HINT}`
    );
  } catch {
    return copyFallback(
      shareUrl,
      `카카오톡보내기를 사용할 수 없어 리포트 링크를 복사했습니다. ${KAKAO_PRODUCT_LINK_HINT}`
    );
  }
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
