/**
 * Kakao JavaScript SDK 초기화
 *
 * 반드시 Kakao Developers → 앱 키 → 「JavaScript 키」를
 * NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY 에 넣으세요.
 * REST API 키 / Native App Key / Admin Key 는 Kakao.init() 에 사용할 수 없습니다.
 */

export const KAKAO_SDK_URL =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (settings: Record<string, unknown>) => void;
    sendScrap: (settings: { requestUrl: string }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

/** 클라이언트 — JavaScript 키 (NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY) */
export function getKakaoJavaScriptKey(): string | null {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  return key || null;
}

export function isKakaoShareConfigured(): boolean {
  return Boolean(getKakaoJavaScriptKey());
}

function waitForKakaoGlobal(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Kakao) return Promise.resolve(true);

  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.Kakao) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

/** Kakao SDK 스크립트 로드 — window.Kakao 가 준비될 때까지 대기 */
export function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("browser only"));
  }

  if (window.Kakao?.isInitialized?.()) {
    return Promise.resolve();
  }

  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const finish = async () => {
      const ready = await waitForKakaoGlobal();
      if (ready && window.Kakao) {
        resolve();
      } else {
        sdkLoadPromise = null;
        reject(new Error("Kakao SDK global not available"));
      }
    };

    const existing = document.querySelector(
      `script[src="${KAKAO_SDK_URL}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        void finish().catch(reject);
        return;
      }
      existing.addEventListener("load", () => {
        existing.setAttribute("data-loaded", "true");
        void finish().catch(reject);
      });
      existing.addEventListener("error", () => {
        sdkLoadPromise = null;
        reject(new Error("sdk load failed"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      void finish().catch(reject);
    };
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error("sdk load failed"));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Kakao.init() — window.Kakao 로드 후, isInitialized() 가 false 일 때만 실행
 */
export function initKakaoSdk(): boolean {
  const key = getKakaoJavaScriptKey();
  if (!key || typeof window === "undefined" || !window.Kakao) {
    return false;
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }

  return window.Kakao.isInitialized();
}

export type KakaoReadyResult =
  | { ok: true }
  | { ok: false; message: string };

/** SDK 로드 + init (카카오톡 공유 전 호출) */
export async function ensureKakaoSdkReady(): Promise<KakaoReadyResult> {
  const key = getKakaoJavaScriptKey();
  if (!key) {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY(자바스크립트 키)가 필요합니다. REST API 키·Native App Key·Admin Key는 사용할 수 없습니다.",
    };
  }

  try {
    await loadKakaoSdk();
  } catch {
    return {
      ok: false,
      message:
        "카카오 SDK를 불러오지 못했습니다. 네트워크 또는 광고 차단 설정을 확인해 주세요.",
    };
  }

  if (!window.Kakao) {
    return {
      ok: false,
      message:
        "window.Kakao 가 로드되지 않았습니다. JavaScript 키와 SDK 스크립트 URL을 확인해 주세요.",
    };
  }

  if (!initKakaoSdk()) {
    return {
      ok: false,
      message:
        "Kakao.init()에 실패했습니다. JavaScript 키인지 확인하고, Kakao Developers → 플랫폼 → Web 도메인과 제품 링크에 NEXT_PUBLIC_SITE_URL 도메인을 등록해 주세요.",
    };
  }

  return { ok: true };
}
