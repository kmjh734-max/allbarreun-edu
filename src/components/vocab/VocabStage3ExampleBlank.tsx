"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  completeStage3,
  recordStage3ExampleAttempt,
} from "@/app/student/vocab/actions";
import {
  gradeExampleBlankAnswer,
  type ExampleBlankQuestion,
} from "@/lib/vocab/example-blank";

function shuffleQuestions(questions: ExampleBlankQuestion[]): ExampleBlankQuestion[] {
  const copy = [...questions];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface VocabStage3ExampleBlankProps {
  setId: string;
  setTitle: string;
  itemCount: number;
  questions: ExampleBlankQuestion[];
  excludedCount: number;
}

export function VocabStage3ExampleBlank({
  setId,
  setTitle,
  itemCount,
  questions: initialQuestions,
  excludedCount,
}: VocabStage3ExampleBlankProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState(() => shuffleQuestions(initialQuestions));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    showAnswer: boolean;
    displayAnswer: string;
  } | null>(null);
  const [round, setRound] = useState(1);
  const [mastered, setMastered] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [autoCompleting, setAutoCompleting] = useState(false);

  const total = initialQuestions.length;
  const current = queue[0];
  const progressPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

  useEffect(() => {
    if (!current || feedback?.showAnswer) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [current, feedback]);

  useEffect(() => {
    if (total > 0 || itemCount === 0 || autoCompleting) return;
    setAutoCompleting(true);
    void (async () => {
      await completeStage3(setId);
      router.push(`/student/vocab/${setId}`);
      router.refresh();
    })();
  }, [total, itemCount, setId, router, autoCompleting]);

  function checkAnswer() {
    if (!current || feedback?.showAnswer) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setMessage("답을 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    setMessage(null);

    const isCorrect = gradeExampleBlankAnswer(current.acceptedAnswers, trimmed);
    const displayAnswer =
      current.acceptedAnswers.length > 1
        ? current.acceptedAnswers.join(" / ")
        : current.word;
    const attemptRound = round;

    if (isCorrect) {
      setMastered((m) => m + 1);
      const next = queue.slice(1);
      if (next.length === 0) {
        void (async () => {
          await recordStage3ExampleAttempt(
            setId,
            current.itemId,
            trimmed,
            displayAnswer,
            true,
            attemptRound
          );
          await completeStage3(setId);
          router.push(`/student/vocab/${setId}`);
          router.refresh();
        })();
        return;
      }
      void recordStage3ExampleAttempt(
        setId,
        current.itemId,
        trimmed,
        displayAnswer,
        true,
        attemptRound
      );
      setQueue(next);
      setAnswer("");
      setFeedback(null);
    } else {
      void recordStage3ExampleAttempt(
        setId,
        current.itemId,
        trimmed,
        displayAnswer,
        false,
        attemptRound
      );
      setFeedback({ showAnswer: true, displayAnswer });
      setRound((r) => r + 1);
    }
  }

  function continueAfterWrong() {
    if (!current) return;
    const rest = queue.slice(1);
    setQueue([...rest, current]);
    setAnswer("");
    setFeedback(null);
    setMessage(null);
  }

  if (itemCount === 0) {
    return <p className="text-center text-slate-600">단어가 없습니다.</p>;
  }

  if (total === 0) {
    return (
      <EmptyQuestionsView
        setId={setId}
        setTitle={setTitle}
        message="예문이 있는 단어가 없어 3단계를 자동 완료합니다."
      />
    );
  }

  if (!current) {
    return (
      <div className="text-center">
        <p className="font-semibold text-emerald-700">3단계 완료</p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => router.push(`/student/vocab/${setId}`)}
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
          href={`/student/vocab/${setId}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장으로
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{setTitle} · 3단계</h1>
        <p className="text-sm text-slate-500">
          예문 빈칸에 들어갈 영어 단어를 입력하세요
        </p>
        {excludedCount > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            예문이 없는 단어 {excludedCount}개는 3단계에서 제외되었습니다.
          </p>
        )}
        <ProgressBar
          percent={progressPercent}
          label={`맞춘 문제 ${mastered} / ${total} · 남은 ${queue.length}개`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-center text-sm text-slate-600">
          빈칸에 들어갈 영어 단어를 입력하세요.
        </p>
        {current.exampleMeaning && (
          <p className="mt-4 text-center text-sm text-slate-600">
            {current.exampleMeaning}
          </p>
        )}
        <p
          className={`text-center text-xl font-medium leading-relaxed text-slate-900 ${
            current.exampleMeaning ? "mt-4" : "mt-6"
          }`}
        >
          {current.blankSentence}
        </p>

        {feedback?.showAnswer ? (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-lg font-semibold text-rose-700">오답입니다</p>
            <p className="text-2xl font-bold text-emerald-800">
              {feedback.displayAnswer}
            </p>
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
              placeholder="영어 단어 입력"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="빈칸 영어 단어 입력"
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

function EmptyQuestionsView(props: {
  setId: string;
  setTitle: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-2 text-center">
      <Link
        href={`/student/vocab/${props.setId}`}
        className="text-sm text-brand-600 hover:underline"
      >
        ← 단어장으로
      </Link>
      <h1 className="text-lg font-semibold">{props.setTitle} · 3단계</h1>
      <p className="text-slate-600">{props.message}</p>
      <p className="text-sm text-slate-500">잠시만 기다려 주세요...</p>
    </div>
  );
}
