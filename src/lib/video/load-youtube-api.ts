let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires browser"));
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const done = () => {
      if (window.YT?.Player) resolve();
      else reject(new Error("YouTube IFrame API failed to load"));
    };

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      done();
    };

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existing) {
      const interval = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(interval);
          resolve();
        }
      }, 100);
      window.setTimeout(() => {
        window.clearInterval(interval);
        if (!window.YT?.Player) {
          reject(new Error("YouTube IFrame API load timeout"));
        }
      }, 15000);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => reject(new Error("YouTube IFrame API script error"));
    document.head.appendChild(tag);
  });

  return ytApiPromise;
}
