import Link from "next/link";
import { STAGE4_PASS_SCORE } from "@/lib/vocab/build-stage3-questions";
import {
  stage3Completed,
  stage4AttemptCount,
  stage4BestScore,
  stage4LastScore,
  stage4Passed,
} from "@/lib/vocab/stage-progress-fields";
import type { VocabStageProgress } from "@/types/database";

interface VocabSetStageHubProps {
  setId: string;
  setTitle: string;
  itemCount: number;
  progress: VocabStageProgress;
  /** 변형문제 QR 학습: 예문(3단계) 생략 */
  examCompact?: boolean;
}

function statusPill(
  label: string,
  variant: "locked" | "todo" | "done" | "pass" | "fail"
) {
  const styles: Record<string, string> = {
    locked: "bg-slate-100 text-slate-500",
    todo: "bg-amber-50 text-amber-800",
    done: "bg-emerald-50 text-emerald-800",
    pass: "bg-emerald-100 text-emerald-900",
    fail: "bg-rose-50 text-rose-800",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

interface StageRowProps {
  step: string;
  title: string;
  desc: string;
  status: string;
  variant: "locked" | "todo" | "done" | "pass" | "fail";
  href?: string;
  secondaryHref?: string;
  locked?: boolean;
  buttonLabel: string;
  secondaryButtonLabel?: string;
}

function StageRow({
  step,
  title,
  desc,
  status,
  variant,
  href,
  secondaryHref,
  locked,
  buttonLabel,
  secondaryButtonLabel,
}: StageRowProps) {
  const actionButtons = (
    <>
      {locked || !href ? (
        <span className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs text-slate-400 sm:flex-none">
          {buttonLabel}
        </span>
      ) : (
        <Link
          href={href}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-brand-700 hover:bg-brand-50 sm:flex-none sm:text-sm"
        >
          {buttonLabel}
        </Link>
      )}
      {secondaryHref && secondaryButtonLabel && (
        <Link
          href={secondaryHref}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:flex-none sm:text-sm"
        >
          {secondaryButtonLabel}
        </Link>
      )}
    </>
  );

  return (
    <li
      className={`border-b border-slate-100 px-4 py-3.5 last:border-b-0 ${
        locked ? "bg-slate-50/50" : "hover:bg-slate-50/80"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="shrink-0 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
            {step}단계
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
          </div>
          {statusPill(status, variant)}
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
          {actionButtons}
        </div>
      </div>
    </li>
  );
}

export function VocabSetStageHub({
  setId,
  setTitle,
  itemCount,
  progress,
  examCompact = false,
}: VocabSetStageHubProps) {
  const stage1Done = progress.stage1_completed;
  const stage2Done = progress.stage2_completed;
  const stage3Done = examCompact
    ? stage2Done
    : stage3Completed(progress);
  const stage4Pass = stage4Passed(progress);
  const attemptCount = stage4AttemptCount(progress);
  const lastScore = stage4LastScore(progress);
  const bestScore = stage4BestScore(progress);
  const hasAttempt = attemptCount > 0;
  const stage4Fail = hasAttempt && !stage4Pass;

  const stage1Status = stage1Done ? "완료" : "미완료";
  const stage2Status = !stage1Done
    ? "잠김"
    : stage2Done
      ? "완료"
      : "미완료";
  const stage3Status = !stage2Done
    ? "잠김"
    : stage3Done
      ? "완료"
      : "미완료";
  const stage4Status = !stage3Done
    ? "잠김"
    : stage4Pass
      ? "합격"
      : hasAttempt
        ? "불합격"
        : "미응시";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <Link
          href="/student/vocab"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 단어장 목록
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-900">{setTitle}</h1>
        {examCompact ? (
          <p className="mt-1 text-sm text-slate-500">
            변형문제 연계 · 1·2·4단계만 학습합니다 (예문 단계 생략).
          </p>
        ) : null}
      </div>

      {itemCount < 1 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-600">
          등록된 단어가 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">
              학습 단계 <span className="text-slate-400">·</span>{" "}
              <span className="text-slate-500">{itemCount} 카드</span>
            </p>
          </div>
          <ul>
            <StageRow
              step="1"
              title="뜻 익히기"
              desc="단어를 보고 뜻을 익힙니다"
              status={stage1Status}
              variant={stage1Done ? "done" : "todo"}
              href={`/student/vocab/${setId}/stage1`}
              buttonLabel={stage1Done ? "다시 보기" : "시작하기"}
            />
            <StageRow
              step="2"
              title="스펠링 학습"
              desc="한글뜻만 보고 영어 스펠링 입력"
              status={stage2Status}
              variant={
                !stage1Done ? "locked" : stage2Done ? "done" : "todo"
              }
              href={
                stage1Done ? `/student/vocab/${setId}/stage2` : undefined
              }
              locked={!stage1Done}
              buttonLabel={stage2Done ? "다시 하기" : "시작하기"}
            />
            {!examCompact && (
              <StageRow
                step="3"
                title="예문 빈칸 학습"
                desc="예문 빈칸에 들어갈 영어 단어 입력"
                status={stage3Status}
                variant={
                  !stage2Done ? "locked" : stage3Done ? "done" : "todo"
                }
                href={
                  stage2Done ? `/student/vocab/${setId}/stage3` : undefined
                }
                locked={!stage2Done}
                buttonLabel={stage3Done ? "다시 하기" : "시작하기"}
              />
            )}
            <StageRow
              step={examCompact ? "3" : "4"}
              title="종합테스트"
              desc={`뜻·스펠링 혼합 · ${STAGE4_PASS_SCORE}점 이상 합격`}
              status={stage4Status}
              variant={
                !stage3Done
                  ? "locked"
                  : stage4Pass
                    ? "pass"
                    : stage4Fail
                      ? "fail"
                      : "todo"
              }
              href={
                stage3Done ? `/student/vocab/${setId}/stage4` : undefined
              }
              secondaryHref={
                stage3Done && hasAttempt
                  ? `/student/vocab/${setId}/stage4/result`
                  : undefined
              }
              locked={!stage3Done}
              buttonLabel={
                hasAttempt ? "다시 도전하기" : "시작하기"
              }
              secondaryButtonLabel={
                hasAttempt ? "결과 보기" : undefined
              }
            />
          </ul>
          {hasAttempt && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              최근 {lastScore}점 · 최고 {bestScore}점 · 응시 {attemptCount}회
            </p>
          )}
        </div>
      )}
    </div>
  );
}
