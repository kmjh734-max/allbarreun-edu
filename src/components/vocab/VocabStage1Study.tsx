"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { recordStage1Item } from "@/app/student/vocab/actions";
import {
  isSpeechSupported,
  speakEnglish,
  stopSpeaking,
} from "@/lib/vocab/speak-client";
import {
  loadExamGuestProgress,
  saveExamGuestProgress,
} from "@/lib/vocab/exam-guest-progress";
import type { VocabItem } from "@/types/database";

interface VocabStage1StudyProps {
  setId: string;
  setTitle: string;
  items: VocabItem[];
  initialSeenIds: string[];
  stage1Completed: boolean;
  /** 완료 후 이동 경로 (기본: 학생 단어장 허브) */
  hubHref?: string;
  /** 로그인 없이 localStorage에만 저장 */
  guestMode?: boolean;
}

export function VocabStage1Study({
  setId,
  setTitle,
  items,
  initialSeenIds,
  stage1Completed,
  hubHref,
  guestMode = false,
}: VocabStage1StudyProps) {
  const router = useRouter();
  const hub = hubHref ?? `/student/vocab/${setId}`;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(
    () => new Set(stage1Completed ? [] : initialSeenIds)
  );
  const [message, setMessage] = useState<string | null>(null);
  const lastHandledRef = useRef<string | null>(null);
  const speechOk = isSpeechSupported();

  const total = items.length;
  const current = items[index];
  const seenCount = stage1Completed ? index + 1 : seenIds.size;
  const roundPercent =
    total > 0 ? Math.round((seenCount / total) * 100) : 0;

  const goTo = useCallback((next: number) => {
    stopSpeaking();
    setIndex(next);
    setFlipped(false);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!speechOk || !current || flipped) return;
    const t = window.setTimeout(() => speakEnglish(current.word), 80);
    return () => window.clearTimeout(t);
  }, [index, speechOk, current, flipped]);

  useEffect(() => () => stopSpeaking(), []);

  function finishToHub() {
    router.push(hub);
    if (!guestMode) router.refresh();
  }

  function handleResponse(known: boolean) {
    if (!current) return;

    const handleKey = `${index}-${current.id}`;
    if (lastHandledRef.current === handleKey) return;
    lastHandledRef.current = handleKey;

    const itemId = current.id;
    const currentIndex = index;

    if (!stage1Completed) {
      setSeenIds((prev) => new Set([...prev, itemId]));
    }

    const nextSeen = new Set(seenIds);
    if (!stage1Completed) nextSeen.add(itemId);
    const allSeenNow = !stage1Completed && nextSeen.size >= total;
    const atLastCard = currentIndex >= total - 1;

    if (allSeenNow || (stage1Completed && atLastCard)) {
      finishToHub();
    } else if (currentIndex < total - 1) {
      goTo(currentIndex + 1);
    }

    if (guestMode) {
      if (!stage1Completed) {
        const prev = loadExamGuestProgress(setId);
        saveExamGuestProgress(setId, {
          ...prev,
          stage1Seen: [...nextSeen],
          stage1Done: allSeenNow || prev.stage1Done,
        });
      }
      return;
    }

    void recordStage1Item(setId, itemId, known).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (result.message.includes("1단계를 완료")) {
        router.refresh();
      }
    });
  }

  if (total === 0) {
    return (
      <div className="text-center text-slate-600">단어가 없습니다.</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-2">
      <div>
        <Link
          href={hub}
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장으로
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          {setTitle} · 1단계{stage1Completed ? " (다시 보기)" : ""}
        </h1>
        <ProgressBar
          percent={roundPercent}
          label={`학습 ${seenCount} / ${total}`}
        />
      </div>

      <div className="relative w-full" style={{ perspective: "1200px" }}>
        <div
          className={`relative h-[min(48vh,320px)] min-h-[220px] w-full transition-transform duration-200 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-white to-brand-50 px-5 py-6 [backface-visibility:hidden]">
            <p className="text-xs font-semibold text-brand-600">영어 단어</p>
            <p className="text-center text-2xl font-bold sm:text-3xl">
              {current.word}
            </p>
            {speechOk && (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs"
                onClick={() => speakEnglish(current.word)}
              >
                🔊 발음 듣기
              </button>
            )}
            <Button type="button" className="px-6" onClick={() => setFlipped(true)}>
              뜻 보기
            </Button>
          </div>

          <div className="absolute inset-0 flex flex-col rounded-2xl border-2 border-slate-200 bg-white px-5 py-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-xs font-semibold text-slate-500">뜻 · 예문</p>
            <p className="mt-2 text-xl font-bold text-brand-800 sm:text-2xl">
              {current.meaning}
            </p>
            {current.example_sentence && (
              <div className="mt-2 flex-1 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-slate-800">{current.example_sentence}</p>
                {current.example_meaning && (
                  <p className="mt-1 text-slate-600">{current.example_meaning}</p>
                )}
              </div>
            )}
            <div className="mt-auto flex gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => handleResponse(true)}
              >
                알아요
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => handleResponse(false)}
              >
                몰라요
              </Button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <p className="text-center text-sm text-slate-600">{message}</p>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          이전 단어
        </Button>
        <span className="text-sm text-slate-600">
          {index + 1} / {total}
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={index >= total - 1}
          onClick={() => goTo(index + 1)}
        >
          다음 단어
        </Button>
      </div>
    </div>
  );
}
