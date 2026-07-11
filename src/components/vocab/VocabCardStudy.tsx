"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { recordStage1Item } from "@/app/student/vocab/actions";
import {
  isSpeechSupported,
  speakEnglish,
  stopSpeaking,
} from "@/lib/vocab/speak-client";
import type { VocabItem, VocabProgressStatus } from "@/types/database";

export interface VocabStudyItem extends VocabItem {
  progressStatus: VocabProgressStatus;
}

interface VocabCardStudyProps {
  setId: string;
  setTitle: string;
  items: VocabStudyItem[];
}

function SpeakButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
      aria-label={label}
    >
      <span aria-hidden>🔊</span>
      {label}
    </button>
  );
}

export function VocabCardStudy({
  setId,
  setTitle,
  items,
}: VocabCardStudyProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const speechOk = isSpeechSupported();

  const total = items.length;
  const current = items[index];
  const knownCount = items.filter((i) => i.progressStatus === "known").length;
  const progressPercent =
    total > 0 ? Math.round((knownCount / total) * 100) : 0;

  const goTo = useCallback((next: number) => {
    stopSpeaking();
    setIndex(next);
    setFlipped(false);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!autoSpeak || !speechOk || !current || flipped) return;
    const t = window.setTimeout(() => speakEnglish(current.word), 300);
    return () => window.clearTimeout(t);
  }, [index, autoSpeak, speechOk, current, flipped]);

  useEffect(() => () => stopSpeaking(), []);

  function handlePrev() {
    if (index > 0) goTo(index - 1);
  }

  function handleNext() {
    if (index < total - 1) goTo(index + 1);
  }

  function handleResponse(known: boolean) {
    if (!current || pending) return;

    startTransition(async () => {
      const result = await recordStage1Item(setId, current.id, known);
      setMessage(result.message);
      if (result.ok) {
        if (index < total - 1) {
          goTo(index + 1);
        } else {
          router.refresh();
        }
      }
    });
  }

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="text-slate-600">이 단어장에 등록된 단어가 없습니다.</p>
        <ButtonLink href="/student/vocab" variant="secondary" className="mt-4">
          단어장 목록
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-2 sm:px-0">
      <div>
        <Link
          href={`/student/vocab/${setId}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장으로
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
          {setTitle}
        </h1>
        <div className="mt-3">
          <ProgressBar
            percent={progressPercent}
            label={`${index + 1} / ${total} · 알아요 ${knownCount}개`}
          />
        </div>
        {speechOk && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded border-slate-300"
            />
            단어 자동 읽기 (TTS)
          </label>
        )}
        {!speechOk && (
          <p className="mt-2 text-xs text-slate-500">
            이 브라우저에서는 음성(TTS)을 지원하지 않습니다.
          </p>
        )}
      </div>

      <div
        className="relative w-full"
        style={{ perspective: "1200px" }}
      >
        <div
          className={`relative h-[min(72vh,560px)] min-h-[420px] w-full transition-transform duration-500 [transform-style:preserve-3d] sm:min-h-[480px] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-white to-brand-50 px-8 py-12 shadow-[0_16px_48px_rgb(15_23_42/0.14)] [backface-visibility:hidden] sm:px-12 sm:py-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              영어 단어
            </p>
            <p className="text-center text-4xl font-bold leading-tight text-slate-900 sm:text-5xl md:text-6xl">
              {current.word}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              {speechOk && (
                <SpeakButton
                  label="발음 듣기"
                  onClick={() => speakEnglish(current.word)}
                />
              )}
              <Button
                type="button"
                className="min-h-11 px-8 text-base"
                onClick={() => setFlipped(true)}
              >
                뜻 보기
              </Button>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col rounded-3xl border-2 border-slate-200 bg-white px-8 py-10 shadow-[0_16px_48px_rgb(15_23_42/0.14)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-12 sm:py-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              뜻 · 예문
            </p>
            <p className="mt-4 text-3xl font-bold leading-snug text-brand-800 sm:text-4xl">
              {current.meaning}
            </p>
            {current.example_sentence && (
              <div className="mt-6 flex-1 overflow-y-auto rounded-2xl bg-slate-50 p-5 text-base sm:p-6 sm:text-lg">
                <p className="leading-relaxed text-slate-800">
                  {current.example_sentence}
                </p>
                {current.example_meaning && (
                  <p className="mt-3 leading-relaxed text-slate-600">
                    {current.example_meaning}
                  </p>
                )}
                {speechOk && (
                  <div className="mt-4">
                    <SpeakButton
                      label="예문 듣기"
                      onClick={() =>
                        speakEnglish(current.example_sentence ?? "")
                      }
                    />
                  </div>
                )}
              </div>
            )}
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 min-w-[140px] flex-1 text-base"
                disabled={pending}
                onClick={() => handleResponse(true)}
              >
                알아요
              </Button>
              <Button
                type="button"
                className="min-h-12 min-w-[140px] flex-1 text-base"
                disabled={pending}
                onClick={() => handleResponse(false)}
              >
                몰라요
              </Button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <p className="text-center text-sm text-slate-600" role="status">
          {message}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={index === 0}
          onClick={handlePrev}
        >
          이전 단어
        </Button>
        <span className="text-sm font-medium text-slate-600">
          {index + 1} / {total}
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={index >= total - 1}
          onClick={handleNext}
        >
          다음 단어
        </Button>
      </div>

      {index >= total - 1 && (
        <p className="text-center text-sm text-slate-500">
          마지막 단어입니다. 알아요/몰라요를 누르면 학습 기록이 저장됩니다.
        </p>
      )}
    </div>
  );
}
