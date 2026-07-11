"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VocabPrintExamConfig } from "@/components/vocab/VocabPrintExamConfig";
import { ACADEMY_NAME, LOGO_SRC } from "@/lib/branding";
import { generatePrintExamQuestions } from "@/lib/vocab/generate-print-test-questions";
import { highlightWordInSentence } from "@/lib/vocab/highlight-word-in-sentence";
import {
  itemsPerVocabPrintPage,
  paginateVocabItems,
  parseVocabPrintMode,
  tableHeadLabel,
  VOCAB_PRINT_MODE_LABELS,
  type VocabPrintMode,
} from "@/lib/vocab/paginate-vocab-print";
import { useVocabExamPagination } from "@/lib/vocab/use-vocab-exam-pagination";
import {
  EXAM_ROW_GAP_PX,
  examConfigTotal,
  examSettingsToSearchParams,
  parseExamPrintSettings,
  type ExamPrintSettings,
} from "@/lib/vocab/vocab-print-exam-config";
import {
  parseVocabPrintSize,
  VOCAB_PRINT_PAGE_DIMENSIONS,
  VOCAB_PRINT_SIZE_LABELS,
  type VocabPrintSize,
} from "@/lib/vocab/vocab-print-size";
import type {
  VocabPrintRow,
  VocabPrintSection,
} from "@/lib/vocab/vocab-print-types";
import type { PrintExamQuestion } from "@/lib/vocab/generate-print-test-questions";

interface VocabSetPrintViewProps {
  sections: VocabPrintSection[];
  backHref: string;
  documentTitle?: string;
}

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

function formatNo(globalIndex: number) {
  return String(globalIndex + 1).padStart(4, "0");
}

function PrintPageHeader({
  sectionTitle,
}: {
  sectionTitle: string;
}) {
  return (
    <>
      <div className="vocab-print-top-line" />
      <header className="vocab-print-header">
        <div className="vocab-print-header-left">
          <div className="vocab-print-logo-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt={ACADEMY_NAME} className="vocab-print-logo-img" />
          </div>
          <div className="vocab-print-book-meta">
            <p className="vocab-print-series">{ACADEMY_NAME}</p>
            <h2 className="vocab-print-book-title">{sectionTitle}</h2>
          </div>
        </div>
        <div className="vocab-print-header-right">
          <div className="vocab-print-meta-line">
            <span>이름</span>
            <i />
          </div>
          <div className="vocab-print-meta-line">
            <span>날짜</span>
            <i />
          </div>
        </div>
      </header>
    </>
  );
}

export function VocabSetPrintView({
  sections,
  backHref,
  documentTitle,
}: VocabSetPrintViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseVocabPrintMode(searchParams.get("mode") ?? undefined);
  const size = parseVocabPrintSize(searchParams.get("size") ?? undefined);
  const [examSettings, setExamSettings] = useState<ExamPrintSettings>(() =>
    parseExamPrintSettings(searchParams)
  );

  const pageDims = VOCAB_PRINT_PAGE_DIMENSIONS[size];
  const perPage = itemsPerVocabPrintPage(mode, size);
  const examCols = examSettings.layout.columns;
  const examRowGapPx = EXAM_ROW_GAP_PX[examSettings.layout.lineSpacing];

  const allItems = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections]
  );

  const totalItems = allItems.length;

  const examGenerated = useMemo(() => {
    if (mode !== "exam") return { questions: [] as PrintExamQuestion[], skipped: 0 };
    return generatePrintExamQuestions(allItems, examSettings.counts, {
      shuffle: examSettings.layout.shuffle,
      shuffleSeed: examSettings.shuffleSeed,
    });
  }, [
    mode,
    allItems,
    examSettings.counts,
    examSettings.layout.shuffle,
    examSettings.shuffleSeed,
  ]);

  const flatPages = useMemo(() => {
    if (mode === "exam") return [];
    const rows: {
      section: VocabPrintSection;
      pageItems: (VocabPrintRow | null)[];
      pageIndex: number;
      sectionPageTotal: number;
      globalPageNum: number;
      sectionStartIndex: number;
    }[] = [];
    let globalPageNum = 0;
    for (const section of sections) {
      const pages = paginateVocabItems(section.items, perPage);
      pages.forEach((pageItems, pageIndex) => {
        globalPageNum += 1;
        rows.push({
          section,
          pageItems,
          pageIndex,
          sectionPageTotal: pages.length,
          globalPageNum,
          sectionStartIndex: pageIndex * perPage,
        });
      });
    }
    return rows;
  }, [sections, perPage, mode]);

  const title =
    documentTitle ??
    (sections.length === 1
      ? sections[0]!.title
      : `${sections.length}개 단어세트`);
  const headerTitle =
    sections.length === 1 ? sections[0]!.title : title;

  const measureRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipUrlEchoRef = useRef(false);

  const examPagination = useVocabExamPagination({
    enabled: mode === "exam",
    questions: examGenerated.questions,
    size,
    cols: examCols,
    rowGapPx: examRowGapPx,
    lineSpacing: examSettings.layout.lineSpacing,
    measureRef,
    probeRef,
  });

  const resolvedExamPages = examPagination.pages;
  const examBasicQuestions = examPagination.basic;
  const examExampleQuestions = examPagination.examples;

  const pageCount =
    mode === "exam" ? resolvedExamPages.length : flatPages.length;

  useEffect(() => {
    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (skipUrlEchoRef.current) {
      skipUrlEchoRef.current = false;
      return;
    }
    setExamSettings(parseExamPrintSettings(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const id = "vocab-print-page-size-style";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent =
      size === "b5"
        ? "@page { size: B5 portrait; margin: 8mm; }"
        : "@page { size: A4 portrait; margin: 10mm; }";
    return () => {
      el?.remove();
    };
  }, [size]);

  const setQuery = useCallback(
    (key: "mode" | "size", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const syncExamSettingsToUrl = useCallback(
    (next: ExamPrintSettings) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", "exam");
      for (const key of [
        "word_mc",
        "word_sa",
        "meaning_mc",
        "meaning_sa",
        "example_mc",
        "example_sa",
        "exam_cols",
        "exam_spacing",
        "exam_shuffle",
        "exam_seed",
      ]) {
        params.delete(key);
      }
      for (const [k, v] of Object.entries(examSettingsToSearchParams(next))) {
        params.set(k, v);
      }
      skipUrlEchoRef.current = true;
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const queueExamSettingsUrlSync = useCallback(
    (next: ExamPrintSettings) => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
      urlSyncTimerRef.current = setTimeout(() => {
        syncExamSettingsToUrl(next);
      }, 350);
    },
    [syncExamSettingsToUrl]
  );

  const updateExamSettings = useCallback(
    (next: ExamPrintSettings) => {
      setExamSettings(next);
      queueExamSettingsUrlSync(next);
    },
    [queueExamSettingsUrlSync]
  );

  const reshuffleExam = useCallback(() => {
    const next = { ...examSettings, shuffleSeed: Date.now() };
    setExamSettings(next);
    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    syncExamSettingsToUrl(next);
  }, [examSettings, syncExamSettingsToUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const examPageStyle = {
    ["--vocab-exam-cols" as string]: examCols,
    ["--vocab-exam-row-gap" as string]: `${examRowGapPx}px`,
    ["--vocab-page-width" as string]: pageDims.width,
    ["--vocab-page-height" as string]: pageDims.height,
  } as React.CSSProperties;

  if (totalItems === 0) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-slate-600">인쇄할 단어가 없습니다.</p>
        <Link href={backHref} className="mt-4 inline-block text-brand-600 hover:underline">
          돌아가기
        </Link>
      </div>
    );
  }

  const examTotal = examConfigTotal(examSettings.counts);

  const previewPages =
    mode === "exam" ? (
      resolvedExamPages.map((pageSlice, pageIndex) => (
        <article
          key={`exam-${pageIndex}`}
          className={`vocab-print-page vocab-print-page--${size} vocab-print-page--exam vocab-exam-spacing-${examSettings.layout.lineSpacing} ${pageIndex < resolvedExamPages.length - 1 ? "vocab-print-page-break" : ""}`}
          data-size={size}
          style={examPageStyle}
        >
          <PrintPageHeader sectionTitle={headerTitle} />

          <div className="vocab-exam-body">
            {pageSlice.basic.length > 0 ? (
              <div
                className={`vocab-exam-list vocab-exam-list--basic vocab-exam-list--${examCols}col`}
              >
                {pageSlice.basic.map((q) => (
                  <PrintExamEntry key={q.number} question={q} />
                ))}
              </div>
            ) : null}
            {pageSlice.examples.length > 0 ? (
              <div className="vocab-exam-list vocab-exam-list--examples">
                {pageSlice.examples.map((q) => (
                  <PrintExamEntry
                    key={q.number}
                    question={q}
                    variant="example"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <footer className="vocab-print-footer">
            <span>{ACADEMY_NAME}</span>
            <span>
              {pageIndex + 1} / {resolvedExamPages.length}
            </span>
          </footer>
        </article>
      ))
    ) : (
      flatPages.map(
        (
          {
            section,
            pageItems,
            pageIndex,
            sectionPageTotal,
            globalPageNum,
            sectionStartIndex,
          },
          flatIndex
        ) => (
          <article
            key={`${section.setId}-${pageIndex}`}
            className={`vocab-print-page vocab-print-page--${size} ${flatIndex < flatPages.length - 1 ? "vocab-print-page-break" : ""}`}
            data-size={size}
            style={
              {
                ["--vocab-rows-per-page" as string]: perPage,
                ["--vocab-page-width" as string]: pageDims.width,
                ["--vocab-page-height" as string]: pageDims.height,
              } as React.CSSProperties
            }
          >
            <PrintPageHeader sectionTitle={section.title} />

            <div className="vocab-print-table-head">
              <div>NO.</div>
              <div>WORD</div>
              <div>{tableHeadLabel(mode)}</div>
            </div>

            <div className="vocab-print-list">
              {pageItems.map((item, rowIndex) => {
                const globalIndex = sectionStartIndex + rowIndex;
                if (!item) {
                  return (
                    <div
                      key={`empty-${rowIndex}`}
                      className="vocab-print-row empty"
                    />
                  );
                }
                return (
                  <PrintEntry
                    key={item.id}
                    item={item}
                    globalIndex={globalIndex}
                    mode={mode}
                  />
                );
              })}
            </div>

            <footer className="vocab-print-footer">
              <span>{ACADEMY_NAME}</span>
              <span>
                {pageIndex + 1} / {sectionPageTotal}
                {sections.length > 1 ? ` · 전체 p.${globalPageNum}` : ""}
              </span>
            </footer>
          </article>
        )
      )
    );

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      {mode === "exam" && examGenerated.questions.length > 0 ? (
        <>
          <div
            ref={measureRef}
            className="pointer-events-none fixed -left-[200vw] top-0 opacity-0"
            aria-hidden
          >
            <article
              className={`vocab-print-page vocab-print-page--${size} vocab-print-page--exam vocab-exam-spacing-${examSettings.layout.lineSpacing}`}
              style={examPageStyle}
            >
              <div
                className={`vocab-exam-list vocab-exam-list--basic vocab-exam-list--${examCols}col`}
              >
                {examBasicQuestions.map((q) => (
                  <div key={q.number} data-measure-basic={q.number}>
                    <PrintExamEntry question={q} />
                  </div>
                ))}
              </div>
              <div className="vocab-exam-list vocab-exam-list--examples">
                {examExampleQuestions.map((q) => (
                  <div key={q.number} data-measure-example={q.number}>
                    <PrintExamEntry question={q} variant="example" />
                  </div>
                ))}
              </div>
            </article>
          </div>
          <div
            ref={probeRef}
            className="pointer-events-none fixed -left-[200vw] top-0 opacity-0"
            aria-hidden
          >
            <article
              className={`vocab-print-page vocab-print-page--${size} vocab-print-page--exam`}
              style={examPageStyle}
            >
              <PrintPageHeader sectionTitle={headerTitle} />
              <div data-exam-body-zone className="min-h-0 flex-1" />
              <footer className="vocab-print-footer">
                <span>{ACADEMY_NAME}</span>
                <span>1 / 1</span>
              </footer>
            </article>
          </div>
        </>
      ) : null}
      <div className="flex min-h-screen print:block">
        <aside className="no-print w-[min(100%,320px)] shrink-0 border-r border-slate-200 bg-white">
          <div className="sticky top-0 flex max-h-screen flex-col gap-4 overflow-y-auto p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">단어장 인쇄</p>
              <h1 className="mt-0.5 text-base font-bold leading-snug text-slate-900">
                {title}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {totalItems}단어 · {pageCount}페이지 · {VOCAB_PRINT_SIZE_LABELS[size]}
                {mode === "exam" && examGenerated.questions.length > 0
                  ? ` · 문항 ${examGenerated.questions.length}개`
                  : ""}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">용지</p>
              <div className="flex gap-2">
                {(["a4", "b5"] as VocabPrintSize[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuery("size", key)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      size === key
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {VOCAB_PRINT_SIZE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">인쇄 종류</p>
              <div className="flex flex-col gap-1.5">
                {(Object.keys(VOCAB_PRINT_MODE_LABELS) as VocabPrintMode[]).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQuery("mode", key)}
                      className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                        mode === key
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {VOCAB_PRINT_MODE_LABELS[key]}
                    </button>
                  )
                )}
              </div>
            </div>

            {mode === "exam" ? (
              <div className="space-y-2">
                <VocabPrintExamConfig
                  settings={examSettings}
                  onChange={updateExamSettings}
                  onReshuffle={reshuffleExam}
                  maxPool={totalItems}
                />
                {examTotal === 0 ? (
                  <p className="text-xs text-amber-700">
                    문항 수를 입력하면 시험지가 생성됩니다.
                  </p>
                ) : null}
                {examTotal > 0 && examGenerated.questions.length === 0 ? (
                  <p className="text-xs text-red-600">
                    문항을 만들 수 없습니다. 객관식은 단어 2개 이상, 예문 문항은
                    예문에 단어가 포함된 항목이 필요합니다.
                  </p>
                ) : null}
                {examGenerated.skipped > 0 ? (
                  <p className="text-xs text-amber-700">
                    {examGenerated.skipped}문항은 보기를 만들 수 없어 제외되었습니다.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                용지 크기({VOCAB_PRINT_SIZE_LABELS[size]})를 선택한 뒤 인쇄하세요.
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handlePrint}
                disabled={mode === "exam" && examGenerated.questions.length === 0}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                인쇄 / PDF 저장
              </button>
              <Link
                href={backHref}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                돌아가기
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto bg-slate-300/40 print:overflow-visible print:bg-white">
          <div className="no-print border-b border-slate-300/60 bg-slate-200/80 px-5 py-2.5 backdrop-blur-sm">
            <p className="text-sm font-semibold text-slate-700">미리보기</p>
            <p className="text-xs text-slate-500">
              {pageCount}페이지 · 스크롤하여 전체 확인
            </p>
          </div>

          <div className="flex justify-center p-5 pb-12 print:p-0">
            <div
              id="vocab-print-root"
              data-size={size}
              className="flex w-full max-w-[920px] flex-col items-center gap-8 print:max-w-none print:gap-0"
            >
              {previewPages}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const PrintExamEntry = memo(function PrintExamEntry({
  question,
  variant = "basic",
}: {
  question: PrintExamQuestion;
  variant?: "basic" | "example";
}) {
  return (
    <section
      className={`vocab-exam-row${variant === "example" ? " vocab-exam-row--example" : ""}`}
    >
      <div className="vocab-exam-q-head">
        <span className="vocab-exam-q-no">{question.number}.</span>
        <div className="vocab-exam-q-main">
          <p className="vocab-exam-prompt">{question.prompt}</p>
        </div>
      </div>
      {question.choices ? (
        <ul className="vocab-exam-choices">
          {question.choices.map((choice, i) => (
            <li key={i}>
              <span className="vocab-exam-choice-mark">
                {CHOICE_MARKS[i] ?? `${i + 1}.`}
              </span>
              {choice}
            </li>
          ))}
        </ul>
      ) : (
        <div className="vocab-exam-answer-line" />
      )}
    </section>
  );
});

function PrintEntry({
  item,
  globalIndex,
  mode,
}: {
  item: VocabPrintRow;
  globalIndex: number;
  mode: VocabPrintMode;
}) {
  const exampleSentence = item.example_sentence?.trim() ?? "";
  const exampleMeaning = item.example_meaning?.trim() ?? "";
  const synonyms = item.synonyms?.trim() ?? "";
  const antonyms = item.antonyms?.trim() ?? "";
  const showFull = mode === "full";
  const pos = item.part_of_speech?.trim();

  return (
    <section className="vocab-print-row">
      <div className="vocab-print-row-left">
        <div className="vocab-print-num">{formatNo(globalIndex)}</div>
        <div className="vocab-print-checks" aria-hidden>
          <span className="vocab-print-check" />
          <span className="vocab-print-check" />
        </div>
      </div>

      <div className="vocab-print-word-box">
        <h2 className="vocab-print-word">{item.word}</h2>
      </div>

      <div className="vocab-print-content">
        <div className="vocab-print-meaning-line">
          <span className="vocab-print-meaning">{item.meaning}</span>
          {pos ? <span className="vocab-print-pos">{pos}</span> : null}
        </div>

        {showFull && exampleSentence ? (
          <p className="vocab-print-example">
            {highlightWordInSentence(exampleSentence, item.word)}
          </p>
        ) : null}

        {showFull && exampleMeaning ? (
          <p className="vocab-print-translation">{exampleMeaning}</p>
        ) : null}

        {showFull && (synonyms || antonyms) ? (
          <div className="vocab-print-meta-tags">
            {synonyms ? (
              <span className="vocab-print-tag syn">
                <span className="label">유의어</span>
                {synonyms}
              </span>
            ) : null}
            {antonyms ? (
              <span className="vocab-print-tag ant">
                <span className="label">반의어</span>
                {antonyms}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
