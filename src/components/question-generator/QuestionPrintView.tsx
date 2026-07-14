"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ListeningPrintQrCode } from "@/components/listening/ListeningPrintQrCode";
import {
  paginateExamQuestions,
  type ExamPageLayout,
} from "@/lib/listening/paginate-exam-questions";
import { ACADEMY_NAME, LOGO_SRC } from "@/lib/branding";
import {
  buildExamVocabUrl,
  questionNeedsVocabGloss,
  parseHardWordsColumn,
} from "@/lib/question-generator/exam-vocab";
import { groupQuestionsByPrintType } from "@/lib/question-generator/print-type-groups";
import {
  cleanQuestionText,
  normalizePassage,
  parseGrammarCorrectionBlocks,
  parseReferenceAnswerBlock,
  parseSummaryWritingBlocks,
  parseWordOrderBlocks,
  reflowPassageForPrint,
} from "@/lib/question-generator/text-utils";

type QuestionRow = {
  id: string;
  instruction: string;
  question_text: string;
  passage_original: string;
  passage_modified: string | null;
  choices: Array<{ number: number; text: string }> | null;
  correct_answer: unknown;
  explanation: string;
  question_type?: string;
  category?: string;
  option_key?: string | null;
  hard_words?: Array<{ word: string; meaning: string }> | null;
  choice_language?: string | null;
};

type PrintLayoutMode = "mixed" | "byType";

type DisplayItem = {
  kind: "q";
  id: string;
  q: QuestionRow;
  num: number;
};

type SheetPage = ExamPageLayout & {
  /** 유형별 출력: 이 페이지가 새 유형의 첫 장일 때 소제목 */
  sectionLabel?: string;
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

/** A4 본문 열 폭(mm) — 여백·중간 구분선 반영 */
const COL_WIDTH_MM = 88;
const QUESTION_GAP_PX = 14;
const COLUMN_SAFETY_PX = 12;
const BRANDING_STORAGE_KEY = "qg-print-branding";

type PrintBranding = {
  headerKicker: string;
  headerTitle: string;
  headerSub: string;
  footerLeft: string;
  footerRight: string;
  showLogo: boolean;
};

function formatAnswer(a: unknown): string {
  if (Array.isArray(a)) return a.join(" / ");
  if (typeof a === "number" && a >= 1 && a <= 5) {
    return CIRCLED[a - 1] ?? String(a);
  }
  return String(a ?? "");
}

function extractBannerNo(sourceDetail: string): string | null {
  const m = sourceDetail.match(/(\d{1,2})\s*번/);
  return m ? m[1] : null;
}

function padNo(n: number): string {
  return String(n).padStart(2, "0");
}

function questionPassage(q: QuestionRow): string {
  const mod = (q.passage_modified || "").trim();
  const orig = (q.passage_original || "").trim();
  if (mod && normalizePassage(mod) !== normalizePassage(orig)) return mod;
  return orig || mod;
}

function parseBogiLines(text: string): string[] {
  const cleaned = cleanQuestionText(text).trim();
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?=\(\d+\))/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts;
  return cleaned.split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

/** <u>…</u> 및 일반 텍스트를 인쇄용 노드로 변환 */
function renderMarkedText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /<u>([\s\S]*?)<\/u>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(
        <span key={`t${key++}`}>{text.slice(last, m.index)}</span>
      );
    }
    nodes.push(
      <u key={`u${key++}`} className="qg-print-u">
        {m[1]}
      </u>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<span key={`t${key++}`}>{text.slice(last)}</span>);
  }
  return nodes.length > 0 ? nodes : [text];
}

function PassageParas({ text }: { text: string }) {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  const blocks = raw
    ? raw
        .split(/\n\s*\n+/)
        .map((para) =>
          para
            .split(/\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean)
    : [];

  if (blocks.length === 0) return null;

  return (
    <div className="qg-print-passage qg-print-passage-block">
      {blocks.map((p, pi) => (
        <p key={pi} className="qg-print-passage-p">
          {renderMarkedText(p)}
        </p>
      ))}
    </div>
  );
}

function WordOrderBoxes({
  blocks,
}: {
  blocks: NonNullable<ReturnType<typeof parseWordOrderBlocks>>;
}) {
  return (
    <div className="qg-print-word-order">
      <div className="qg-print-wo-box">
        <p className="qg-print-wo-label">&lt;조건&gt;</p>
        <div className="qg-print-wo-body">
          {blocks.conditions.split(/\n+/).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
      <div className="qg-print-wo-box">
        <p className="qg-print-wo-label">
          &lt;보기&gt;
          {blocks.allowExtraWords ? (
            <span className="qg-print-wo-hint"> · 없는 단어 추가 가능</span>
          ) : null}
        </p>
        <div className="qg-print-wo-body qg-print-wo-words">
          {blocks.words}
        </div>
      </div>
      <div className="qg-print-wo-box">
        <p className="qg-print-wo-label">&lt;해석&gt;</p>
        <div className="qg-print-wo-body">{blocks.translation}</div>
      </div>
      <p className="qg-print-wo-answer-line">
        ⓐ : _______________________________________________
      </p>
    </div>
  );
}

function SummaryWritingBoxes({
  blocks,
}: {
  blocks: NonNullable<ReturnType<typeof parseSummaryWritingBlocks>>;
}) {
  const labels =
    blocks.blankLabels.length > 0 ? blocks.blankLabels : ["ⓐ", "ⓑ"];
  return (
    <div className="qg-print-word-order">
      <div className="qg-print-wo-box">
        <p className="qg-print-wo-label">&lt;조건&gt;</p>
        <div className="qg-print-wo-body">
          {blocks.conditions.split(/\n+/).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
      {blocks.words != null && blocks.words.trim() ? (
        <div className="qg-print-wo-box">
          <p className="qg-print-wo-label">&lt;보기&gt;</p>
          <div className="qg-print-wo-body qg-print-wo-words">
            {blocks.words}
          </div>
        </div>
      ) : null}
      <div className="qg-print-wo-box">
        <p className="qg-print-wo-label">&lt;요약문&gt;</p>
        <div className="qg-print-wo-body qg-print-wo-summary">
          {blocks.summary}
        </div>
      </div>
      {labels.map((lab) => (
        <p key={lab} className="qg-print-wo-answer-line">
          {lab} : _______________________________________________
        </p>
      ))}
    </div>
  );
}

function GrammarCorrectionBoxes({
  blocks,
}: {
  blocks: NonNullable<ReturnType<typeof parseGrammarCorrectionBlocks>>;
}) {
  const rows = Array.from({ length: blocks.rowCount }, (_, i) => i);
  return (
    <div className="qg-print-word-order">
      <div className="qg-print-wo-box">
        <p className="qg-print-wo-label">&lt;조건&gt;</p>
        <div className="qg-print-wo-body">
          {blocks.conditions.split(/\n+/).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
      <table className="qg-print-fix-table">
        <thead>
          <tr>
            <th>어법상 틀린 곳의 기호</th>
            <th>바르게 고친 것</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i}>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionBlock({
  q,
  index,
}: {
  q: QuestionRow;
  index: number;
}) {
  const isCount = q.question_type === "content_count";
  const isInsertion = q.question_type === "sentence_insertion";
  const isIrrelevant = q.question_type === "irrelevant_sentence";
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
  const passage = questionPassage(q);
  const bogiLines = isCount ? parseBogiLines(q.question_text) : [];
  const showChoices =
    !isCount &&
    !isInsertion &&
    !isIrrelevant &&
    !wordOrder &&
    !summaryWriting &&
    !referenceAnswer &&
    !grammarFix &&
    q.choices &&
    q.choices.length > 0 &&
    q.choices.some((c) => String(c.text ?? "").trim().length > 0);

  if (isCount) {
    return (
      <section className="qg-print-card qg-print-count-card">
        <p className="qg-print-q-head">
          <span className="qg-print-q-num qg-print-count-num">
            {padNo(index)}
          </span>{" "}
          {q.instruction}
        </p>
        {passage.trim() && (
          <div className="qg-print-count-box qg-print-passage-block">
            {reflowPassageForPrint(passage).map((p, pi) => (
              <p key={pi} className="qg-print-passage-p">
                {p}
              </p>
            ))}
          </div>
        )}
        <p className="qg-print-bogi-label">&lt;보기&gt;</p>
        <div className="qg-print-count-box qg-print-bogi-box">
          {bogiLines.map((line, i) => (
            <p key={i} className="qg-print-bogi-line">
              {line}
            </p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="qg-print-card">
      <p className="qg-print-q-head">
        <span className="qg-print-q-num">{padNo(index)}</span> {q.instruction}
      </p>
      {isInsertion && extra ? (
        <div className="qg-print-given-box">{extra}</div>
      ) : null}
      {passage.trim() ? <PassageParas text={passage} /> : null}
      {summaryWriting ? (
        <SummaryWritingBoxes blocks={summaryWriting} />
      ) : null}
      {wordOrder ? <WordOrderBoxes blocks={wordOrder} /> : null}
      {grammarFix ? <GrammarCorrectionBoxes blocks={grammarFix} /> : null}
      {referenceAnswer
        ? referenceAnswer.labels.map((lab) => (
            <p key={lab} className="qg-print-wo-answer-line">
              {lab} : _______________________________________________
            </p>
          ))
        : null}
      {!isInsertion &&
      !wordOrder &&
      !summaryWriting &&
      !referenceAnswer &&
      !grammarFix &&
      extra ? (
        <p className="qg-print-extra">{extra}</p>
      ) : null}
      {showChoices && (
        <ul className="qg-print-choices">
          {q.choices!.map((c) => (
            <li key={c.number}>
              <span className="qg-print-choice-mark">
                {CIRCLED[c.number - 1] ?? `${c.number}.`}
              </span>
              {c.text.trim() ? <span>{c.text}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AnswerBlock({
  q,
  index,
}: {
  q: QuestionRow;
  index: number;
}) {
  const hardWords = questionNeedsVocabGloss({
    choices: q.choices,
    questionType: q.question_type,
    optionKey: q.option_key,
    questionText: q.question_text,
    choiceLanguage: q.choice_language,
  })
    ? parseHardWordsColumn(q.hard_words)
    : [];
  return (
    <section className="qg-print-card qg-print-answer-card">
      <p className="qg-print-answer-head">
        <span className="qg-print-q-num">{padNo(index)}</span>{" "}
        <span className="qg-print-answer-mark">
          {formatAnswer(q.correct_answer)}
        </span>
      </p>
      <p className="qg-print-answer-body">{q.explanation}</p>
      {hardWords.length > 0 ? (
        <div className="qg-print-hard-words">
          <p className="qg-print-hard-words-label">보기 단어 (중3·≈1000L+)</p>
          <ul className="qg-print-hard-words-list">
            {hardWords.map((w) => (
              <li key={`${w.word}-${w.meaning}`}>
                <span className="qg-print-hw-en">{w.word}</span>
                <span className="qg-print-hw-ko">{w.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function loadStoredBranding(): Partial<PrintBranding> | null {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PrintBranding>;
  } catch {
    return null;
  }
}

export function QuestionPrintView({
  jobId,
  backHref,
  printBaseHref,
  mode = "exam",
  layout: layoutProp = "mixed",
}: {
  jobId: string;
  /** ← 뒤로: 내 자료 목록 */
  backHref: string;
  /** 문제지/해설지 전환용 (…/generations/{id}) */
  printBaseHref: string;
  mode?: "exam" | "answers";
  layout?: PrintLayoutMode;
}) {
  const [title, setTitle] = useState("영어 변형문제");
  const [grade, setGrade] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [printLayout, setPrintLayout] = useState<PrintLayoutMode>(layoutProp);
  const [vocabSetId, setVocabSetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<SheetPage[]>([]);
  const [branding, setBranding] = useState<PrintBranding>({
    headerKicker: ACADEMY_NAME,
    headerTitle: "",
    headerSub: "",
    footerLeft: ACADEMY_NAME,
    footerRight: "영어 변형문제",
    showLogo: true,
  });
  const [brandingReady, setBrandingReady] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/question-generator/jobs/${jobId}`);
    const data = await res.json();
    if (!data.ok) {
      setError(data.message ?? "불러오기 실패");
      return;
    }
    const job = data.job;
    const nextTitle =
      job?.request_config?.title ||
      job?.english_source_passages?.title ||
      "영어 변형문제";
    const nextGrade =
      job?.request_config?.grade || job?.english_source_passages?.grade || "";
    const nextDetail =
      job?.request_config?.sourceDetail ||
      job?.english_source_passages?.source_detail ||
      "";
    setTitle(nextTitle);
    setGrade(nextGrade);
    setSourceDetail(nextDetail);
    setQuestions(data.questions ?? []);
    setVocabSetId(
      typeof job?.vocab_set_id === "string" ? job.vocab_set_id : null
    );

    // 보기 단어장 동기화 (없을 때 생성)
    try {
      const vr = await fetch(
        `/api/question-generator/jobs/${jobId}/exam-vocab`,
        { method: "POST" }
      );
      const vd = await vr.json();
      if (vd.ok && vd.vocabSetId) {
        setVocabSetId(vd.vocabSetId as string);
      }
    } catch {
      /* ignore */
    }

    setBranding((prev) => {
      const stored = typeof window !== "undefined" ? loadStoredBranding() : null;
      const kind = mode === "answers" ? "해설지" : "변형문제";
      return {
        headerKicker:
          stored?.headerKicker ??
          prev.headerKicker ??
          `${ACADEMY_NAME}${nextGrade ? ` · ${nextGrade}` : ""}`,
        headerTitle: stored?.headerTitle || nextTitle,
        headerSub: stored?.headerSub ?? nextDetail,
        footerLeft: stored?.footerLeft ?? ACADEMY_NAME,
        footerRight: stored?.footerRight ?? `영어 ${kind}`,
        showLogo: stored?.showLogo ?? true,
      };
    });
    setBrandingReady(true);
  }, [jobId, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!brandingReady) return;
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
    } catch {
      /* ignore */
    }
  }, [branding, brandingReady]);

  const bannerNo = extractBannerNo(sourceDetail);
  const sheetTitle =
    branding.headerTitle ||
    (mode === "answers" ? `${title} · 해설지` : title);

  const displayItems: DisplayItem[] = useMemo(() => {
    if (questions.length === 0) return [];
    if (printLayout !== "byType") {
      return questions.map((q, i) => ({
        kind: "q" as const,
        id: q.id,
        q,
        num: i + 1,
      }));
    }
    const groups = groupQuestionsByPrintType(questions);
    const items: DisplayItem[] = [];
    let num = 1;
    for (const g of groups) {
      for (const q of g.items) {
        items.push({ kind: "q", id: q.id, q, num });
        num++;
      }
    }
    return items;
  }, [questions, printLayout]);

  /** 유형별: 각 유형 구간 [start, end) — 새 페이지 강제용 */
  const typeRanges = useMemo(() => {
    if (printLayout !== "byType" || questions.length === 0) return [];
    const groups = groupQuestionsByPrintType(questions);
    const ranges: { start: number; end: number; label: string }[] = [];
    let start = 0;
    for (const g of groups) {
      const end = start + g.items.length;
      ranges.push({ start, end, label: g.label });
      start = end;
    }
    return ranges;
  }, [questions, printLayout]);

  useEffect(() => {
    if (displayItems.length === 0) {
      setPages([]);
      return;
    }

    const run = () => {
      const root = measureRef.current;
      if (!root) return;
      const heights = displayItems.map((item) => {
        const el = root.querySelector<HTMLElement>(
          `[data-measure-q="${item.id}"]`
        );
        return el ? Math.ceil(el.getBoundingClientRect().height) : 40;
      });

      const mmToPx = (mm: number) => (mm * 96) / 25.4;
      const firstColMax = mmToPx(232);
      const nextColMax = mmToPx(240);
      const paginateOpts = {
        firstColumnMaxPx: firstColMax,
        nextColumnMaxPx: nextColMax,
        questionGapPx: QUESTION_GAP_PX,
        columnSafetyPx: COLUMN_SAFETY_PX,
      };

      if (printLayout === "byType" && typeRanges.length > 0) {
        const all: SheetPage[] = [];
        const bannerReservePx = mmToPx(8); // 유형 소제목 배너
        let isDocFirstSection = true;
        for (const range of typeRanges) {
          if (range.end <= range.start) continue;
          const slice = heights.slice(range.start, range.end);
          const layouts = paginateExamQuestions(slice, {
            firstColumnMaxPx:
              (isDocFirstSection ? firstColMax : nextColMax) - bannerReservePx,
            nextColumnMaxPx: nextColMax,
            questionGapPx: QUESTION_GAP_PX,
            columnSafetyPx: COLUMN_SAFETY_PX,
          }).filter((p) => p.left.length > 0 || p.right.length > 0);
          layouts.forEach((layout, i) => {
            all.push({
              sectionLabel: i === 0 ? range.label : undefined,
              left: layout.left.map((j) => j + range.start),
              right: layout.right.map((j) => j + range.start),
            });
          });
          isDocFirstSection = false;
        }
        setPages(all);
        return;
      }

      const layouts = paginateExamQuestions(heights, paginateOpts).filter(
        (p) => p.left.length > 0 || p.right.length > 0
      );
      setPages(layouts);
    };

    const t = window.setTimeout(run, 50);
    void document.fonts?.ready?.then(() => {
      window.setTimeout(run, 30);
    });
    return () => window.clearTimeout(t);
  }, [displayItems, mode, branding.headerTitle, branding.headerSub, printLayout, typeRanges]);

  function runPrint() {
    const prev = document.title;
    document.title = sheetTitle;
    // 레이아웃·폰트 반영 후 인쇄 (빈 미리보기 방지)
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print();
        window.setTimeout(() => {
          document.title = prev;
        }, 500);
      }, 50);
    });
  }

  function patchBranding(patch: Partial<PrintBranding>) {
    setBranding((prev) => ({ ...prev, ...patch }));
  }

  function resetBranding() {
    const kind = mode === "answers" ? "해설지" : "변형문제";
    setBranding({
      headerKicker: `${ACADEMY_NAME}${grade ? ` · ${grade}` : ""}`,
      headerTitle: title,
      headerSub: sourceDetail,
      footerLeft: ACADEMY_NAME,
      footerRight: `영어 ${kind}`,
      showLogo: true,
    });
  }

  function renderHeader(compact: boolean, pageIdx: number, totalPages: number) {
    const showVocabQr =
      mode === "exam" && !compact && pageIdx === 0 && Boolean(vocabSetId);
    return (
      <header
        className={`qg-print-header ${compact ? "qg-print-header-compact" : ""} ${
          mode === "answers" ? "qg-print-header-answer-sheet" : ""
        }`}
      >
        <div className="qg-print-header-main">
          {branding.showLogo && (
            <div className="qg-print-logo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt={ACADEMY_NAME}
                className="qg-print-logo-img"
              />
            </div>
          )}
          <div className="qg-print-header-text">
            {branding.headerKicker && (
              <p className="qg-print-kicker">{branding.headerKicker}</p>
            )}
            {!compact && branding.headerTitle && (
              <h1 className="qg-print-title">{branding.headerTitle}</h1>
            )}
            {!compact && branding.headerSub && (
              <p className="qg-print-sub">{branding.headerSub}</p>
            )}
            {bannerNo && !compact && mode === "exam" && (
              <p className="qg-print-banner">┃3월 {bannerNo}번┃</p>
            )}
            {compact && branding.headerTitle && (
              <p className="qg-print-title qg-print-title-sm">
                {branding.headerTitle}
              </p>
            )}
          </div>
        </div>
        <div className="qg-print-header-aside">
          <div className="qg-print-header-aside-row">
            <div className="qg-print-header-aside-meta">
              <p className="qg-print-meta">
                {questions.length}문항{" "}
                <span className="qg-print-page-no">
                  {pageIdx + 1}/{totalPages}
                </span>
              </p>
            </div>
            {showVocabQr ? (
              <div className="qg-print-vocab-qr">
                <ListeningPrintQrCode
                  url={buildExamVocabUrl(vocabSetId!)}
                  sizePx={52}
                />
                <p className="qg-print-vocab-qr-label">
                  보기 단어
                  <br />
                  학습 QR
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  function renderFooter() {
    return (
      <footer className="qg-print-footer">
        <div className="qg-print-footer-left">
          {branding.showLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={LOGO_SRC}
              alt=""
              className="qg-print-footer-logo"
            />
          )}
          <span>{branding.footerLeft || ACADEMY_NAME}</span>
        </div>
        <span className="qg-print-footer-right">
          {branding.footerRight || "영어 변형문제"}
        </span>
      </footer>
    );
  }

  if (error) return <p className="p-6 text-red-600">{error}</p>;

  const sheetPages =
    pages.length > 0
      ? pages
      : displayItems.length > 0
        ? [
            {
              left: displayItems.map((_, i) => i),
              right: [] as number[],
            },
          ]
        : [];

  function renderDisplayItem(item: DisplayItem | undefined) {
    if (!item) return null;
    return mode === "exam" ? (
      <QuestionBlock q={item.q} index={item.num} />
    ) : (
      <AnswerBlock q={item.q} index={item.num} />
    );
  }

  return (
    <div className="qg-print-app min-h-screen bg-slate-200 print:min-h-0 print:bg-white">
      <div className="flex min-h-screen print:block print:min-h-0">
        <aside className="no-print sticky top-0 flex h-screen w-[min(100%,320px)] shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={backHref}
              className="text-sm text-slate-700 hover:underline"
            >
              ← 뒤로
            </Link>
            <Button type="button" onClick={runPrint}>
              PDF 저장 / 인쇄
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              보기 전환
            </p>
            <Link
              href={`${printBaseHref}/print?mode=exam${printLayout === "byType" ? "&layout=byType" : ""}`}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                mode === "exam"
                  ? "bg-brand-700 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              문제지
            </Link>
            <Link
              href={`${printBaseHref}/print?mode=answers`}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                mode === "answers"
                  ? "bg-brand-700 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              해설지
            </Link>
          </div>

          {mode === "exam" && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                출력 방식
              </p>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                  printLayout === "mixed"
                    ? "bg-brand-700 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => setPrintLayout("mixed")}
              >
                종합해서 출력
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                  printLayout === "byType"
                    ? "bg-brand-700 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => setPrintLayout("byType")}
              >
                유형별 출력
              </button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                머릿말 · 꼬릿말
              </p>
              <button
                type="button"
                className="text-xs text-brand-700 hover:underline"
                onClick={resetBranding}
              >
                기본값으로
              </button>
            </div>
            <div className="grid gap-2">
              <label className="block text-xs text-slate-600">
                머릿말 상단
                <input
                  className="ui-input mt-1 py-1.5 text-sm"
                  value={branding.headerKicker}
                  onChange={(e) =>
                    patchBranding({ headerKicker: e.target.value })
                  }
                  placeholder={ACADEMY_NAME}
                />
              </label>
              <label className="block text-xs text-slate-600">
                머릿말 제목
                <input
                  className="ui-input mt-1 py-1.5 text-sm"
                  value={branding.headerTitle}
                  onChange={(e) =>
                    patchBranding({ headerTitle: e.target.value })
                  }
                  placeholder="자료 제목"
                />
              </label>
              <label className="block text-xs text-slate-600">
                머릿말 부제
                <input
                  className="ui-input mt-1 py-1.5 text-sm"
                  value={branding.headerSub}
                  onChange={(e) => patchBranding({ headerSub: e.target.value })}
                  placeholder="출처·설명"
                />
              </label>
              <label className="block text-xs text-slate-600">
                꼬릿말 왼쪽
                <input
                  className="ui-input mt-1 py-1.5 text-sm"
                  value={branding.footerLeft}
                  onChange={(e) =>
                    patchBranding({ footerLeft: e.target.value })
                  }
                  placeholder={ACADEMY_NAME}
                />
              </label>
              <label className="block text-xs text-slate-600">
                꼬릿말 오른쪽
                <input
                  className="ui-input mt-1 py-1.5 text-sm"
                  value={branding.footerRight}
                  onChange={(e) =>
                    patchBranding({ footerRight: e.target.value })
                  }
                  placeholder="영어 변형문제"
                />
              </label>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={branding.showLogo}
                onChange={(e) => patchBranding({ showLogo: e.target.checked })}
              />
              학원 로고 표시
            </label>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div
            ref={measureRef}
            aria-hidden
            className="qg-print-measure no-print"
            style={{ width: `${COL_WIDTH_MM}mm` }}
          >
            {displayItems.map((item) => (
              <div key={item.id} data-measure-q={item.id}>
                {renderDisplayItem(item)}
              </div>
            ))}
          </div>

          <div
            id="qg-print-root"
            className="max-w-[210mm] px-4 py-6 print:mx-0 print:max-w-none print:px-0 print:py-0"
          >
            {sheetPages.map((page, pageIdx) => (
              <article
                key={pageIdx}
                className={`qg-print-page qg-print-sheet ${
                  pageIdx < sheetPages.length - 1
                    ? "qg-print-page-break"
                    : "qg-print-page-last"
                }`}
              >
                {renderHeader(pageIdx > 0, pageIdx, sheetPages.length)}
                {page.sectionLabel ? (
                  <div className="qg-print-type-banner">
                    <p className="qg-print-type-banner-title">
                      {page.sectionLabel}
                    </p>
                  </div>
                ) : null}
                <div className="qg-print-cols">
                  <div className="qg-print-col">
                    {page.left.map((ii) => (
                      <div key={displayItems[ii]?.id ?? ii}>
                        {renderDisplayItem(displayItems[ii])}
                      </div>
                    ))}
                  </div>
                  <div className="qg-print-col qg-print-col-right">
                    {page.right.map((ii) => (
                      <div key={displayItems[ii]?.id ?? ii}>
                        {renderDisplayItem(displayItems[ii])}
                      </div>
                    ))}
                  </div>
                </div>
                {renderFooter()}
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
