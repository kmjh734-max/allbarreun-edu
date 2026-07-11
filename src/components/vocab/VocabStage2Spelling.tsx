"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  completeStage2,
  recordStage2Attempt,
} from "@/app/student/vocab/actions";
import { gradeSpellingAnswer } from "@/lib/vocab/grade-spelling";
import {
  loadExamGuestProgress,
  saveExamGuestProgress,
} from "@/lib/vocab/exam-guest-progress";
import type { VocabItem } from "@/types/database";

function shuffleIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface VocabStage2SpellingProps {
  setId: string;
  setTitle: string;
  items: VocabItem[];
  hubHref?: string;
  guestMode?: boolean;
}

export function VocabStage2Spelling({
  setId,
  setTitle,
  items,
  hubHref,
  guestMode = false,
}: VocabStage2SpellingProps) {
  const router = useRouter();
  const hub = hubHref ?? `/student/vocab/${setId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const [queue, setQueue] = useState(() => shuffleIds(items.map((i) => i.id)));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    showAnswer: boolean;
  } | null>(null);
  const [round, setRound] = useState(1);
  const [mastered, setMastered] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const total = items.length;
  const currentId = queue[0];
  const current = currentId ? itemById.get(currentId) : undefined;
  const progressPercent =
    total > 0 ? Math.round((mastered / total) * 100) : 0;

  useEffect(() => {
    if (!current || feedback?.showAnswer) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [currentId, current, feedback]);

  function checkAnswer() {
    if (!current || feedback?.showAnswer) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setMessage("답을 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    setMessage(null);

    const isCorrect = gradeSpellingAnswer(current.word, trimmed);
    const itemId = current.id;
    const attemptRound = round;

    if (isCorrect) {
      setMastered((m) => m + 1);
      const next = queue.slice(1);
      if (next.length === 0) {
        void (async () => {
          if (guestMode) {
            const prev = loadExamGuestProgress(setId);
            saveExamGuestProgress(setId, { ...prev, stage2Done: true });
            router.push(hub);
            return;
          }
          await recordStage2Attempt(
            setId,
            itemId,
            trimmed,
            true,
            attemptRound
          );
          await completeStage2(setId);
          router.push(hub);
          router.refresh();
        })();
        return;
      }
      if (!guestMode) {
        void recordStage2Attempt(setId, itemId, trimmed, true, attemptRound);
      }
      setQueue(next);
      setAnswer("");
      setFeedback(null);
    } else {
      if (!guestMode) {
        void recordStage2Attempt(setId, itemId, trimmed, false, attemptRound);
      }
      setFeedback({ correct: false, showAnswer: true });
      setRound((r) => r + 1);
    }
  }

  function continueAfterWrong() {
    if (!current) return;
    const rest = queue.slice(1);
    setQueue([...rest, current.id]);
    setAnswer("");
    setFeedback(null);
    setMessage(null);
  }

  if (total === 0) {
    return <p className="text-center text-slate-600">단어가 없습니다.</p>;
  }

  if (!current) {
    return (
      <div className="text-center">
        <p className="font-semibold text-emerald-700">2단계 완료</p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => router.push(hub)}
        >
          단어장으로
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-2">
      <div>
        <Link
          href={hub}
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장으로
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{setTitle} · 2단계</h1>
        <p className="text-sm text-slate-500">
          한글뜻만 보고 영어 스펠링을 입력하세요 (예문 없음)
        </p>
        <ProgressBar
          percent={progressPercent}
          label={`맞춘 단어 ${mastered} / ${total} · 남은 ${queue.length}개`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-center text-sm text-slate-600">
          한글뜻에 맞는 영어 단어를 입력하세요.
        </p>
        <p className="mt-6 text-center text-3xl font-bold text-brand-800">
          {current.meaning}
        </p>

        {feedback?.showAnswer ? (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-lg font-semibold text-rose-700">오답입니다</p>
            <p className="text-2xl font-bold text-emerald-800">{current.word}</p>
            <Button
              type="button"
              onClick={continueAfterWrong}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  continueAfterWrong();
                }
              }}
            >
              다음으로
            </Button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              className="ui-input mt-8 min-h-[3.5rem] text-center text-xl"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value.toLowerCase());
                if (message === "답을 입력해주세요.") setMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  checkAnswer();
                }
              }}
              placeholder="영어 스펠링 입력"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="영어 스펠링 입력"
            />
            <div className="mt-6 flex justify-center">
              <Button type="button" onClick={checkAnswer}>
                정답 확인
              </Button>
            </div>
          </>
        )}
      </div>

      {message && (
        <p className="text-center text-sm font-medium text-amber-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
