"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import type { PrintExamQuestion } from "@/lib/vocab/generate-print-test-questions";
import {
  paginateExamPrintFromHeights,
  paginateExamPrintPages,
  type ExamPrintPageSlice,
} from "@/lib/vocab/paginate-exam-print";
import type {
  ExamColumnCount,
  ExamLineSpacing,
} from "@/lib/vocab/vocab-print-exam-config";

function splitExamQuestions(questions: PrintExamQuestion[]) {
  const basic: PrintExamQuestion[] = [];
  const examples: PrintExamQuestion[] = [];
  for (const q of questions) {
    if (q.kind.startsWith("example_")) examples.push(q);
    else basic.push(q);
  }
  return { basic, examples };
}

function measureHeights(
  root: HTMLElement,
  attr: "data-measure-basic" | "data-measure-example",
  list: PrintExamQuestion[],
  fallback: number
): number[] {
  const byNumber = new Map<number, number>();
  root.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
    const num = Number(el.getAttribute(attr));
    if (Number.isFinite(num)) byNumber.set(num, el.offsetHeight);
  });
  return list.map((q) => byNumber.get(q.number) ?? fallback);
}

export function useVocabExamPagination(opts: {
  enabled: boolean;
  questions: PrintExamQuestion[];
  size: "a4" | "b5";
  cols: ExamColumnCount;
  rowGapPx: number;
  lineSpacing: ExamLineSpacing;
  measureRef: React.RefObject<HTMLDivElement | null>;
  probeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    enabled,
    questions,
    size,
    cols,
    rowGapPx,
    lineSpacing,
    measureRef,
    probeRef,
  } = opts;

  const { basic, examples } = useMemo(
    () => splitExamQuestions(questions),
    [questions]
  );

  const estimatedPages = useMemo(() => {
    if (!enabled || questions.length === 0) {
      return [{ basic: [], examples: [] }] as ExamPrintPageSlice[];
    }
    return paginateExamPrintPages(questions, size, cols, lineSpacing);
  }, [enabled, questions, size, cols, lineSpacing]);

  const [measuredPages, setMeasuredPages] = useState<ExamPrintPageSlice[] | null>(
    null
  );
  const bodyHeightRef = useRef(0);

  useLayoutEffect(() => {
    if (!enabled) {
      setMeasuredPages(null);
      return;
    }
    if (questions.length === 0) {
      setMeasuredPages([{ basic: [], examples: [] }]);
      return;
    }

    const measureRoot = measureRef.current;
    const probe = probeRef.current;
    if (!measureRoot || !probe) return;

    const bodyZone = probe.querySelector<HTMLElement>("[data-exam-body-zone]");
    const bodyH = bodyZone?.clientHeight ?? 0;
    if (bodyH > 0) bodyHeightRef.current = bodyH;
    const maxBodyHeightPx = bodyHeightRef.current;
    if (maxBodyHeightPx <= 0) return;

    const basicHeights = measureHeights(
      measureRoot,
      "data-measure-basic",
      basic,
      72
    );
    const exampleHeights = measureHeights(
      measureRoot,
      "data-measure-example",
      examples,
      96
    );

    const next = paginateExamPrintFromHeights(
      basic,
      examples,
      basicHeights,
      exampleHeights,
      maxBodyHeightPx,
      cols,
      rowGapPx
    );

    startTransition(() => {
      setMeasuredPages(next);
    });
  }, [
    enabled,
    questions,
    basic,
    examples,
    size,
    cols,
    rowGapPx,
    lineSpacing,
    measureRef,
    probeRef,
  ]);

  return {
    pages: measuredPages ?? estimatedPages,
    basic,
    examples,
  };
}
