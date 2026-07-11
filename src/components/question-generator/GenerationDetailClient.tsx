"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  cleanQuestionText,
  parseGrammarCorrectionBlocks,
  parseReferenceAnswerBlock,
  parseSummaryWritingBlocks,
  parseWordOrderBlocks,
} from "@/lib/question-generator/text-utils";

type QuestionRow = {
  id: string;
  category: string;
  question_type: string;
  instruction: string;
  question_text: string;
  passage_modified: string | null;
  passage_original?: string;
  choices: Array<{ number: number; text: string }> | null;
  correct_answer: unknown;
  explanation: string;
  status: string;
  error_message: string | null;
  option_key: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  main_idea: "대의 파악",
  details: "세부 정보",
  inference: "추론 능력",
  grammar_vocabulary: "어법·어휘",
  subjective: "주관식·서술형",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  analyzing: "지문 분석 중",
  generating: "생성 중",
  validating: "생성 중",
  partially_completed: "일부 완료",
  completed: "완료",
  failed: "실패",
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

function formatAnswer(a: unknown): string {
  if (Array.isArray(a)) return a.join(" / ");
  if (typeof a === "number" && a >= 1 && a <= 5) {
    return CIRCLED[a - 1] ?? String(a);
  }
  return String(a ?? "");
}

export function GenerationDetailClient({
  jobId,
  basePath,
}: {
  jobId: string;
  basePath: string;
}) {
  const [job, setJob] = useState<{
    status: string;
    progress_message: string | null;
    total_requested: number;
    total_completed: number;
    total_failed: number;
    error_message: string | null;
    request_config?: { title?: string };
    english_source_passages?: { title?: string; passage?: string };
  } | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<QuestionRow>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const res = await fetch(`/api/question-generator/jobs/${jobId}`);
    const data = await res.json();
    if (!data.ok) {
      setError(data.message ?? "불러오기 실패");
      return;
    }
    setJob(data.job);
    setQuestions(data.questions ?? []);
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 대기·실패 + 문항 0 → 생성 화면(지문·유형)으로
  useEffect(() => {
    if (!job) return;
    const empty =
      (job.status === "pending" || job.status === "failed") &&
      (job.total_completed ?? 0) === 0 &&
      questions.length === 0;
    if (!empty) return;
    router.replace(
      `${basePath}/new?fromJob=${encodeURIComponent(jobId)}`
    );
  }, [job, questions.length, basePath, jobId, router]);

  useEffect(() => {
    if (!job) return;
    const running = ["pending", "analyzing", "generating", "validating"].includes(
      job.status
    );
    if (!running) return;
    const t = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(t);
  }, [job, load]);

  const grouped = useMemo(() => {
    const map = new Map<string, QuestionRow[]>();
    for (const q of questions) {
      const list = map.get(q.category) ?? [];
      list.push(q);
      map.set(q.category, list);
    }
    return map;
  }, [questions]);

  async function runAction(id: string, action: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/question-generator/questions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.message ?? "처리 실패");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/question-generator/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: editDraft.instruction,
          question_text: editDraft.question_text,
          passage_modified: editDraft.passage_modified,
          choices: editDraft.choices,
          correct_answer: editDraft.correct_answer,
          explanation: editDraft.explanation,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message);
        return;
      }
      setEditingId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("이 문제를 삭제할까요?")) return;
    await fetch(`/api/question-generator/questions/${id}`, { method: "DELETE" });
    await load();
  }

  async function retryJob() {
    setError(null);
    void fetch(`/api/question-generator/jobs/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    window.setTimeout(() => void load(), 800);
  }

  const running =
    job &&
    ["pending", "analyzing", "generating", "validating"].includes(job.status);

  const printExamHref = `${basePath}/generations/${jobId}/print?mode=exam`;
  const printExamByTypeHref = `${basePath}/generations/${jobId}/print?mode=exam&layout=byType`;
  const printAnswersHref = `${basePath}/generations/${jobId}/print?mode=answers`;

  return (
    <div>
      <PageHeader
        title={
          job?.request_config?.title ||
          job?.english_source_passages?.title ||
          "생성 결과"
        }
        description="생성된 문제를 바로 PDF로 저장할 수 있습니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={basePath}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              ← 내 자료
            </Link>
            <Link
              href={`${basePath}/new`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              새로 만들기
            </Link>
          </div>
        }
      />

      {questions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href={printExamHref}
            className="inline-flex items-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            종합 문제 PDF
          </Link>
          <Link
            href={printExamByTypeHref}
            className="inline-flex items-center rounded-xl border border-brand-700 bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
          >
            유형별 문제 PDF
          </Link>
          <Link
            href={printAnswersHref}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            해설지 PDF
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {job && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
              {STATUS_LABEL[job.status] ?? job.status}
            </span>
            <span className="text-slate-600">
              {job.progress_message || "—"}
            </span>
            <span className="text-slate-500">
              완료 {job.total_completed}/{job.total_requested}
              {job.total_failed > 0
                ? ` · 폐기 ${job.total_failed}`
                : ""}
            </span>
            {running && (
              <span className="animate-pulse text-brand-700">진행 중…</span>
            )}
            {(job.status === "failed" ||
              job.status === "partially_completed") && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void retryJob()}
              >
                실패 유형 재시도
              </Button>
            )}
          </div>
          {job.error_message && (
            <p className="mt-2 text-sm text-red-600">{job.error_message}</p>
          )}
        </div>
      )}

      {[...grouped.entries()].map(([cat, list]) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {CATEGORY_LABEL[cat] ?? cat}{" "}
            <span className="text-sm font-normal text-slate-500">
              {list.length}문항
            </span>
          </h2>
          <div className="space-y-4">
            {list.map((q, idx) => {
              const editing = editingId === q.id;
              const summaryWriting = parseSummaryWritingBlocks(q.question_text);
              const wordOrder = summaryWriting
                ? null
                : parseWordOrderBlocks(q.question_text);
              const grammarFix =
                summaryWriting || wordOrder
                  ? null
                  : parseGrammarCorrectionBlocks(q.question_text);
              const referenceAnswer =
                summaryWriting || wordOrder || grammarFix
                  ? null
                  : parseReferenceAnswerBlock(q.question_text);
              const extra =
                summaryWriting || wordOrder || referenceAnswer || grammarFix
                  ? ""
                  : cleanQuestionText(q.question_text);
              return (
                <article
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                >
                  {editing ? (
                    <div className="space-y-2">
                      <label className="block text-xs">
                        발문
                        <textarea
                          className="ui-input mt-1 min-h-[60px]"
                          value={editDraft.instruction ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              instruction: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="block text-xs">
                        추가 안내 (선택)
                        <textarea
                          className="ui-input mt-1 min-h-[60px]"
                          value={editDraft.question_text ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              question_text: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="block text-xs">
                        변형 지문
                        <textarea
                          className="ui-input mt-1 min-h-[100px] font-serif"
                          value={editDraft.passage_modified ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              passage_modified: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="block text-xs">
                        선택지 (JSON)
                        <textarea
                          className="ui-input mt-1 min-h-[100px] font-mono text-xs"
                          value={JSON.stringify(editDraft.choices ?? [], null, 2)}
                          onChange={(e) => {
                            try {
                              setEditDraft((d) => ({
                                ...d,
                                choices: JSON.parse(e.target.value),
                              }));
                            } catch {
                              /* ignore while typing */
                            }
                          }}
                        />
                      </label>
                      <label className="block text-xs">
                        정답
                        <input
                          className="ui-input mt-1"
                          value={String(editDraft.correct_answer ?? "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            const num = Number(v);
                            setEditDraft((d) => ({
                              ...d,
                              correct_answer:
                                Number.isFinite(num) && v.trim() !== ""
                                  ? num
                                  : v,
                            }));
                          }}
                        />
                      </label>
                      <label className="block text-xs">
                        해설
                        <textarea
                          className="ui-input mt-1 min-h-[80px]"
                          value={editDraft.explanation ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              explanation: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          disabled={busyId === q.id}
                          onClick={() => void saveEdit(q.id)}
                        >
                          저장
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900">
                        {idx + 1}. {q.instruction}
                      </p>
                      {q.question_type === "sentence_insertion" && extra && (
                        <div className="mt-2 rounded-md border-2 border-slate-700 bg-slate-50 px-3 py-2 font-serif text-sm text-slate-900">
                          {extra}
                        </div>
                      )}
                      {q.passage_modified && (
                        <div
                          className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-serif text-sm text-slate-800 [&_u]:font-semibold [&_u]:underline"
                          dangerouslySetInnerHTML={{
                            __html: (q.passage_modified || "")
                              .replace(/&/g, "&amp;")
                              .replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;")
                              .replace(/&lt;u&gt;/gi, "<u>")
                              .replace(/&lt;\/u&gt;/gi, "</u>")
                              .replace(/\n/g, "<br/>"),
                          }}
                        />
                      )}
                      {summaryWriting && (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="rounded-md border border-slate-400 px-3 py-2">
                            <p className="mb-1 font-semibold text-slate-900">
                              &lt;조건&gt;
                            </p>
                            <p className="whitespace-pre-wrap text-slate-800">
                              {summaryWriting.conditions}
                            </p>
                          </div>
                          {summaryWriting.words != null &&
                            summaryWriting.words.trim() && (
                              <div className="rounded-md border border-slate-400 px-3 py-2">
                                <p className="mb-1 font-semibold text-slate-900">
                                  &lt;보기&gt;
                                </p>
                                <p className="text-center font-serif text-slate-900">
                                  {summaryWriting.words}
                                </p>
                              </div>
                            )}
                          <div className="rounded-md border border-slate-400 px-3 py-2">
                            <p className="mb-1 font-semibold text-slate-900">
                              &lt;요약문&gt;
                            </p>
                            <p className="whitespace-pre-wrap font-serif text-slate-800">
                              {summaryWriting.summary}
                            </p>
                          </div>
                          {(summaryWriting.blankLabels.length
                            ? summaryWriting.blankLabels
                            : ["ⓐ", "ⓑ"]
                          ).map((lab) => (
                            <p
                              key={lab}
                              className="font-medium text-slate-900"
                            >
                              {lab} : ________________
                            </p>
                          ))}
                        </div>
                      )}
                      {wordOrder && (
                        <div className="mt-3 space-y-1.5 text-sm">
                          <div className="rounded-md border border-slate-400 px-2.5 py-1.5">
                            <p className="mb-0.5 font-semibold text-slate-900">
                              &lt;조건&gt;
                            </p>
                            <p className="whitespace-pre-wrap text-slate-800">
                              {wordOrder.conditions}
                            </p>
                          </div>
                          <div className="rounded-md border border-slate-400 px-2.5 py-1.5">
                            <p className="mb-0.5 font-semibold text-slate-900">
                              &lt;보기&gt;
                              {wordOrder.allowExtraWords ? (
                                <span className="font-normal text-slate-500">
                                  {" "}
                                  · 없는 단어 추가 가능
                                </span>
                              ) : null}
                            </p>
                            <p className="text-center font-serif text-slate-900">
                              {wordOrder.words}
                            </p>
                          </div>
                          <div className="rounded-md border border-slate-400 px-2.5 py-1.5">
                            <p className="mb-0.5 font-semibold text-slate-900">
                              &lt;해석&gt;
                            </p>
                            <p className="whitespace-pre-wrap text-slate-800">
                              {wordOrder.translation}
                            </p>
                          </div>
                          <p className="font-medium text-slate-900">
                            ⓐ : ________________
                          </p>
                        </div>
                      )}
                      {grammarFix && (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="rounded-md border border-slate-400 px-3 py-2">
                            <p className="mb-1 font-semibold text-slate-900">
                              &lt;조건&gt;
                            </p>
                            <p className="whitespace-pre-wrap text-slate-800">
                              {grammarFix.conditions}
                            </p>
                          </div>
                          <table className="w-full border-collapse text-center text-sm">
                            <thead>
                              <tr>
                                <th className="border border-slate-400 bg-slate-50 px-2 py-1">
                                  어법상 틀린 곳의 기호
                                </th>
                                <th className="border border-slate-400 bg-slate-50 px-2 py-1">
                                  바르게 고친 것
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(
                                { length: grammarFix.rowCount },
                                (_, i) => (
                                  <tr key={i}>
                                    <td className="border border-slate-400 px-2 py-3">
                                      &nbsp;
                                    </td>
                                    <td className="border border-slate-400 px-2 py-3">
                                      &nbsp;
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {referenceAnswer && (
                        <div className="mt-3 space-y-1 text-sm">
                          {referenceAnswer.labels.map((lab) => (
                            <p
                              key={lab}
                              className="font-medium text-slate-900"
                            >
                              {lab} : ________________
                            </p>
                          ))}
                        </div>
                      )}
                      {q.question_type !== "sentence_insertion" &&
                        !wordOrder &&
                        !summaryWriting &&
                        !referenceAnswer &&
                        !grammarFix &&
                        extra && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                          {extra}
                        </p>
                      )}
                      {q.question_type !== "sentence_insertion" &&
                        q.question_type !== "irrelevant_sentence" &&
                        !wordOrder &&
                        !summaryWriting &&
                        !referenceAnswer &&
                        !grammarFix &&
                        !(
                          q.question_type === "vocabulary" &&
                          (!q.choices ||
                            q.choices.length === 0 ||
                            q.choices.every((c) => !String(c.text ?? "").trim()))
                        ) &&
                        q.choices &&
                        q.choices.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm">
                            {q.choices.map((c) => (
                              <li key={c.number}>
                                {CIRCLED[c.number - 1] ?? `${c.number}.`}
                                {c.text.trim() ? ` ${c.text}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      <p className="mt-3 text-sm">
                        <span className="font-semibold text-brand-800">정답</span>{" "}
                        {formatAnswer(q.correct_answer)}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-semibold">해설</span>{" "}
                        {q.explanation}
                      </p>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(q.id);
                        setEditDraft(q);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === q.id}
                      onClick={() => void runAction(q.id, "regenerate")}
                    >
                      재생성
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void remove(q.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {!running && questions.length === 0 && job?.status === "completed" && (
        <Alert variant="info">생성된 문항이 없습니다.</Alert>
      )}
    </div>
  );
}
