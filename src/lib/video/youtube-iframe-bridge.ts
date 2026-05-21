/** YouTube iframe embed + postMessage (YT.Player로 iframe을 덮지 않음 → 검은 화면 방지) */

const YT_ORIGINS = new Set([
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
]);

export const YT_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface YouTubeIframeInfo {
  currentTime: number;
  duration: number;
  playerState: number;
}

type InfoHandler = (info: YouTubeIframeInfo) => void;

function parseMessageData(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return null;
}

function postToIframe(iframe: HTMLIFrameElement, payload: Record<string, unknown>) {
  iframe.contentWindow?.postMessage(JSON.stringify(payload), "*");
}

export function createYouTubeIframeBridge(
  iframe: HTMLIFrameElement,
  onInfo: InfoHandler
) {
  let active = true;
  let pollId = 0;

  const onMessage = (event: MessageEvent) => {
    if (!active) return;
    if (event.source !== iframe.contentWindow) return;
    if (!YT_ORIGINS.has(event.origin)) return;

    const data = parseMessageData(event.data);
    if (!data) return;

    if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
      const info = data.info as Record<string, unknown>;
      const currentTime =
        typeof info.currentTime === "number" ? info.currentTime : 0;
      const duration = typeof info.duration === "number" ? info.duration : 0;
      const playerState =
        typeof info.playerState === "number" ? info.playerState : -1;
      onInfo({ currentTime, duration, playerState });
    }
  };

  window.addEventListener("message", onMessage);

  function sendCommand(func: string, args: unknown = "") {
    postToIframe(iframe, { event: "command", func, args });
  }

  function start() {
    postToIframe(iframe, { event: "listening", id: 1 });
    sendCommand("addEventListener", "onStateChange");
    sendCommand("addEventListener", "onReady");

    pollId = window.setInterval(() => {
      if (!active) return;
      sendCommand("getCurrentTime");
      sendCommand("getDuration");
    }, 1000);
  }

  function seekTo(seconds: number) {
    sendCommand("seekTo", [Math.max(0, seconds), true]);
  }

  function destroy() {
    active = false;
    window.clearInterval(pollId);
    window.removeEventListener("message", onMessage);
  }

  return { start, seekTo, destroy };
}
