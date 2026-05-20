"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildVimeoEmbedUrl } from "@/lib/video/parse-url";
import { loadYouTubeIframeApi } from "@/lib/video/load-youtube-api";
import { resolveLessonVideo } from "@/lib/video/lesson-fields";
import { shouldPersistProgress } from "@/lib/lesson-progress/save-throttle";
import {
  isCompletionReached,
  isForwardSeekBeyondMax,
  isNaturalPlayheadAdvance,
  watchedPercentFromSeconds,
} from "@/lib/lesson-progress/watch-tracker";

interface StudentLessonWatchProps {
  lessonId: string;
  title: string;
  videoProvider?: string | null;
  vimeoUrl?: string | null;
  vimeoVideoId?: string | null;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  initialIsCompleted: boolean;
  initialProgressPercent: number;
  initialWatchedSeconds?: number;
  materialUrl?: string | null;
}

async function postLessonProgress(payload: {
  lessonId: string;
  watchedSeconds: number;
  progressPercent: number;
  isCompleted: boolean;
}): Promise<{
  ok: boolean;
  message?: string;
  isCompleted?: boolean;
  progressPercent?: number;
  watchedSeconds?: number;
}> {
  const res = await fetch("/api/student/lesson-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  try {
    const data = await res.json();
    if (!res.ok && data.ok !== true) {
      return {
        ok: false,
        message: data.message ?? `저장 실패 (${res.status})`,
      };
    }
    return data;
  } catch {
    return { ok: false, message: "서버 응답을 읽을 수 없습니다." };
  }
}

type PlayerHandle =
  | { kind: "vimeo"; player: import("@vimeo/player").default }
  | { kind: "youtube"; player: YT.Player };

export function StudentLessonWatch({
  lessonId,
  title,
  videoProvider,
  vimeoUrl,
  vimeoVideoId,
  youtubeUrl,
  youtubeVideoId,
  initialIsCompleted,
  initialProgressPercent,
  initialWatchedSeconds = 0,
  materialUrl,
}: StudentLessonWatchProps) {
  const router = useRouter();
  const resolved = resolveLessonVideo({
    video_provider: videoProvider,
    vimeo_url: vimeoUrl,
    vimeo_video_id: vimeoVideoId,
    youtube_url: youtubeUrl,
    youtube_video_id: youtubeVideoId,
  });

  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const [ytContainerEl, setYtContainerEl] = useState<HTMLDivElement | null>(
    null
  );
  const playerRef = useRef<PlayerHandle | null>(null);
  const completionSentRef = useRef(initialIsCompleted);
  const maxWatchedSecondsRef = useRef(Math.max(0, initialWatchedSeconds));
  const lastTickSecondsRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const lastSavedPercentRef = useRef(initialProgressPercent);
  const lastSavedSecondsRef = useRef(Math.max(0, initialWatchedSeconds));
  const persistInFlightRef = useRef(false);
  const resumeGraceUntilRef = useRef(0);

  const resumeSeconds =
    !initialIsCompleted && initialWatchedSeconds > 0
      ? initialWatchedSeconds
      : 0;

  const [displayPercent, setDisplayPercent] = useState(initialProgressPercent);
  const displayPercentRef = useRef(initialProgressPercent);
  displayPercentRef.current = displayPercent;
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [seekNotice, setSeekNotice] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const persistProgress = useCallback(
    async (
      watchedSeconds: number,
      progressPercent: number,
      complete: boolean
    ) => {
      if (persistInFlightRef.current && !complete) return;
      persistInFlightRef.current = true;

      try {
        const data = await postLessonProgress({
          lessonId,
          watchedSeconds,
          progressPercent,
          isCompleted: complete,
        });

        if (data.ok) {
          setSaveError(null);
          const savedPct = data.progressPercent ?? progressPercent;
          const savedSec = data.watchedSeconds ?? watchedSeconds;
          lastSavedPercentRef.current = savedPct;
          lastSavedSecondsRef.current = savedSec;
          setDisplayPercent(savedPct);

          if (data.isCompleted || complete) {
            setIsCompleted(true);
            completionSentRef.current = true;
            router.refresh();
          }
        } else {
          setSaveError(data.message ?? "진행률 저장에 실패했습니다.");
        }
      } finally {
        persistInFlightRef.current = false;
      }
    },
    [lessonId, router]
  );

  const persistProgressRef = useRef(persistProgress);
  persistProgressRef.current = persistProgress;

  const handleComplete = useCallback(
    async (watchedSeconds: number, duration: number) => {
      if (completionSentRef.current) return;
      completionSentRef.current = true;

      const finalPercent = Math.max(
        watchedPercentFromSeconds(watchedSeconds, duration),
        90
      );

      setDisplayPercent(finalPercent);
      setIsCompleted(true);
      setStatusMessage("수강 완료되었습니다.");

      await persistProgress(Math.floor(watchedSeconds), finalPercent, true);
    },
    [persistProgress]
  );

  const handleCompleteRef = useRef(handleComplete);
  handleCompleteRef.current = handleComplete;

  const seekToSeconds = useCallback(async (seconds: number) => {
    const handle = playerRef.current;
    if (!handle) return;
    try {
      if (handle.kind === "vimeo") {
        await handle.player.setCurrentTime(seconds);
      } else {
        handle.player.seekTo(seconds, true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const getPlaybackState = useCallback(async (): Promise<{
    seconds: number;
    duration: number;
  } | null> => {
    const handle = playerRef.current;
    if (!handle) return null;
    try {
      if (handle.kind === "vimeo") {
        const [seconds, duration] = await Promise.all([
          handle.player.getCurrentTime(),
          handle.player.getDuration(),
        ]);
        return { seconds, duration };
      }
      const seconds = handle.player.getCurrentTime();
      const duration = handle.player.getDuration();
      return { seconds, duration };
    } catch {
      return null;
    }
  }, []);

  const syncFromPlayhead = useCallback(
    async (seconds: number, duration: number, forceSave = false) => {
      if (completionSentRef.current || duration <= 0) return;

      const inResumeGrace = Date.now() < resumeGraceUntilRef.current;
      const enforceAntiSkip = !completionSentRef.current && !inResumeGrace;

      if (
        enforceAntiSkip &&
        !isNaturalPlayheadAdvance(seconds, lastTickSecondsRef.current)
      ) {
        const max = maxWatchedSecondsRef.current;
        await seekToSeconds(max);
        setSeekNotice("앞으로 건너뛸 수 없습니다. 이어서 시청해 주세요.");
        lastTickSecondsRef.current = max;
        return;
      }

      lastTickSecondsRef.current = seconds;

      if (seconds > maxWatchedSecondsRef.current) {
        maxWatchedSecondsRef.current = seconds;
      }

      const pct = watchedPercentFromSeconds(
        maxWatchedSecondsRef.current,
        duration
      );
      setDisplayPercent(pct);
      setSeekNotice(null);

      if (isCompletionReached(maxWatchedSecondsRef.current, duration)) {
        await handleCompleteRef.current(
          maxWatchedSecondsRef.current,
          duration
        );
        return;
      }

      const now = Date.now();
      const watchedSec = Math.floor(maxWatchedSecondsRef.current);
      if (
        forceSave ||
        shouldPersistProgress(
          pct,
          watchedSec,
          lastSaveTimeRef.current,
          lastSavedPercentRef.current,
          lastSavedSecondsRef.current,
          now
        )
      ) {
        lastSaveTimeRef.current = now;
        await persistProgressRef.current(watchedSec, pct, false);
      }
    },
    [seekToSeconds]
  );

  const syncFromPlayheadRef = useRef(syncFromPlayhead);
  syncFromPlayheadRef.current = syncFromPlayhead;

  useEffect(() => {
    if (!resolved) return;

    let disposed = false;

    if (resolved.provider === "vimeo") {
      if (!iframeEl) return;

      type VimeoPlayer = import("@vimeo/player").default;
      let player: VimeoPlayer | null = null;

      const onTimeupdate = (data: {
        seconds: number;
        percent: number;
        duration: number;
      }) => {
        void syncFromPlayheadRef.current(
          data.seconds,
          data.duration,
          false
        );
      };

      const onSeeked = async (data: { seconds: number; duration: number }) => {
        if (completionSentRef.current || !player) return;

        if (isForwardSeekBeyondMax(data.seconds, maxWatchedSecondsRef.current)) {
          const max = maxWatchedSecondsRef.current;
          try {
            await player.setCurrentTime(max);
          } catch {
            /* ignore */
          }
          lastTickSecondsRef.current = max;
          setSeekNotice("앞으로 건너뛸 수 없습니다. 이어서 시청해 주세요.");
        }
      };

      const onEnded = async (data: { duration: number }) => {
        if (completionSentRef.current) return;

        maxWatchedSecondsRef.current = Math.max(
          maxWatchedSecondsRef.current,
          data.duration
        );

        if (isCompletionReached(maxWatchedSecondsRef.current, data.duration)) {
          await handleCompleteRef.current(
            maxWatchedSecondsRef.current,
            data.duration
          );
        } else {
          await syncFromPlayheadRef.current(
            maxWatchedSecondsRef.current,
            data.duration,
            true
          );
        }
      };

      let attached = false;

      async function attachVimeo() {
        if (disposed || attached) return;
        attached = true;

        try {
          const { default: Player } = await import("@vimeo/player");
          if (disposed || !iframeEl) return;

          player = new Player(iframeEl);
          playerRef.current = { kind: "vimeo", player };

          player.on("timeupdate", onTimeupdate);
          player.on("seeked", onSeeked);
          player.on("ended", onEnded);
          setPlayerReady(true);

          const resumeTo = maxWatchedSecondsRef.current;
          if (resumeTo > 0 && !completionSentRef.current) {
            const seekTo = Math.max(0, resumeTo - 1);
            try {
              await player.ready();
              await player.setCurrentTime(seekTo);
              lastTickSecondsRef.current = seekTo;
              resumeGraceUntilRef.current = Date.now() + 4000;
            } catch {
              /* embed #t= may already seek */
            }
          }
        } catch (err) {
          attached = false;
          console.error("[StudentLessonWatch] Vimeo init failed:", err);
          setSaveError(
            "영상 플레이어 연결에 실패했습니다. 새로고침 후 다시 시도해 주세요."
          );
        }
      }

      const onLoad = () => void attachVimeo();
      iframeEl.addEventListener("load", onLoad, { once: true });
      const attachFallbackId = window.setTimeout(() => void attachVimeo(), 2500);

      const pollId = window.setInterval(() => {
        if (disposed || !player || completionSentRef.current) return;
        void (async () => {
          const state = await getPlaybackState();
          if (!state) return;
          await syncFromPlayheadRef.current(
            state.seconds,
            state.duration,
            false
          );
        })();
      }, 4000);

      return () => {
        disposed = true;
        window.clearTimeout(attachFallbackId);
        window.clearInterval(pollId);
        iframeEl.removeEventListener("load", onLoad);
        setPlayerReady(false);
        if (player) {
          player.off("timeupdate", onTimeupdate);
          player.off("seeked", onSeeked);
          player.off("ended", onEnded);
        }
        playerRef.current = null;
      };
    }

    if (!ytContainerEl || resolved.provider !== "youtube") return;

    const youtubeVideoId = resolved.videoId;
    let ytPlayer: YT.Player | null = null;
    let pollId = 0;
    let lastYtSeconds = 0;

    async function attachYouTube() {
      if (disposed) return;

      try {
        await loadYouTubeIframeApi();
        if (disposed || !ytContainerEl) return;

        const start = Math.max(0, Math.floor(resumeSeconds));

        ytPlayer = new YT.Player(ytContainerEl, {
          videoId: youtubeVideoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (disposed) return;
              playerRef.current = { kind: "youtube", player: event.target };
              setPlayerReady(true);

              const resumeTo = maxWatchedSecondsRef.current;
              if (resumeTo > 0 && !completionSentRef.current) {
                const seekTo = Math.max(0, resumeTo - 1);
                try {
                  event.target.seekTo(seekTo, true);
                  lastTickSecondsRef.current = seekTo;
                  lastYtSeconds = seekTo;
                  resumeGraceUntilRef.current = Date.now() + 4000;
                } catch {
                  /* ignore */
                }
              }
            },
            onStateChange: (event) => {
              if (disposed || completionSentRef.current) return;

              const duration = event.target.getDuration();
              if (duration <= 0) return;

              if (event.data === YT.PlayerState.ENDED) {
                maxWatchedSecondsRef.current = Math.max(
                  maxWatchedSecondsRef.current,
                  duration
                );
                void (async () => {
                  if (
                    isCompletionReached(
                      maxWatchedSecondsRef.current,
                      duration
                    )
                  ) {
                    await handleCompleteRef.current(
                      maxWatchedSecondsRef.current,
                      duration
                    );
                  } else {
                    await syncFromPlayheadRef.current(
                      maxWatchedSecondsRef.current,
                      duration,
                      true
                    );
                  }
                })();
                return;
              }

              if (event.data === YT.PlayerState.PLAYING) {
                const seconds = event.target.getCurrentTime();
                if (
                  isForwardSeekBeyondMax(
                    seconds,
                    maxWatchedSecondsRef.current
                  ) &&
                  seconds - lastYtSeconds > 2
                ) {
                  const max = maxWatchedSecondsRef.current;
                  event.target.seekTo(max, true);
                  lastTickSecondsRef.current = max;
                  setSeekNotice(
                    "앞으로 건너뛸 수 없습니다. 이어서 시청해 주세요."
                  );
                  return;
                }
                lastYtSeconds = seconds;
                void syncFromPlayheadRef.current(seconds, duration, false);
              }
            },
          },
        });
      } catch (err) {
        console.error("[StudentLessonWatch] YouTube init failed:", err);
        setSaveError(
          "영상 플레이어 연결에 실패했습니다. 새로고침 후 다시 시도해 주세요."
        );
      }
    }

    void attachYouTube();

    pollId = window.setInterval(() => {
      if (disposed || completionSentRef.current) return;
      void (async () => {
        const state = await getPlaybackState();
        if (!state || state.duration <= 0) return;
        await syncFromPlayheadRef.current(
          state.seconds,
          state.duration,
          false
        );
      })();
    }, 4000);

    return () => {
      disposed = true;
      window.clearInterval(pollId);
      setPlayerReady(false);
      try {
        ytPlayer?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [
    resolved,
    iframeEl,
    ytContainerEl,
    resumeSeconds,
    getPlaybackState,
  ]);

  useEffect(() => {
    if (!resolved) return;

    const flushProgress = () => {
      if (completionSentRef.current) return;
      const sec = Math.floor(maxWatchedSecondsRef.current);
      const pct = displayPercentRef.current;
      if (sec <= 0 && pct <= 0) return;
      if (
        pct <= lastSavedPercentRef.current &&
        sec <= lastSavedSecondsRef.current
      ) {
        return;
      }
      void postLessonProgress({
        lessonId,
        watchedSeconds: sec,
        progressPercent: pct,
        isCompleted: false,
      }).then((data) => {
        if (data.ok) {
          lastSavedPercentRef.current = data.progressPercent ?? pct;
          lastSavedSecondsRef.current = data.watchedSeconds ?? sec;
        }
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushProgress();
    };

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushProgress);

    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushProgress);
      flushProgress();
    };
  }, [lessonId, resolved]);

  if (!resolved) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        등록된 동영상이 없습니다.
      </div>
    );
  }

  const isVimeo = resolved.provider === "vimeo";
  const embedUrl = isVimeo
    ? buildVimeoEmbedUrl(resolved.videoId, resumeSeconds)
    : null;

  return (
    <div className="space-y-6">
      {resumeSeconds > 0 && !isCompleted && (
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {initialProgressPercent}%까지 시청하셨습니다.{" "}
          <strong>이어서 재생</strong>됩니다. (앞으로 건너뛰기는 할 수 없습니다)
        </p>
      )}

      <div className="overflow-hidden rounded-xl bg-black shadow-lg">
        <div
          key={`${resolved.provider}-${resolved.videoId}-${resumeSeconds}`}
          className="relative aspect-video w-full"
        >
          {isVimeo ? (
            <iframe
              ref={setIframeEl}
              src={embedUrl!}
              title={title}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          ) : (
            <div
              ref={setYtContainerEl}
              className="absolute inset-0 h-full w-full"
              title={title}
            />
          )}
        </div>
      </div>

      {!playerReady && (
        <p className="text-xs text-slate-500">
          영상을 불러오는 중입니다. 재생이 되지 않으면 새로고침해 주세요.
        </p>
      )}

      {saveError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {saveError}
        </p>
      )}

      {seekNotice && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {seekNotice}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">누적 시청률</p>
            <p className="text-2xl font-bold text-brand-700">
              {displayPercent}%
            </p>
          </div>
          {isCompleted ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              ✓ 수강 완료
            </span>
          ) : (
            <span className="text-sm text-slate-500">
              완료 기준: 90% 이상 순서대로 시청
            </span>
          )}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${Math.min(100, displayPercent)}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-slate-600">
          시청한 만큼 자동 저장되며, 다시 들어오면 이어서 재생됩니다. 90% 이상
          순서대로 시청하면 수강 완료 처리됩니다.
        </p>

        {isCompleted || statusMessage ? (
          <p className="mt-2 text-sm font-medium text-green-700">
            {statusMessage ?? "수강 완료되었습니다."}
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-700">
            아직 수강 완료 기준에 도달하지 않았습니다.
          </p>
        )}
      </div>

      {materialUrl && (
        <a
          href={materialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          PDF 학습자료 다운로드
        </a>
      )}
    </div>
  );
}
