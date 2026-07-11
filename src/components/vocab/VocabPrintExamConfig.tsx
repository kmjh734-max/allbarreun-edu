"use client";

import type {
  ExamColumnCount,
  ExamLineSpacing,
  ExamPrintConfig,
  ExamPrintLayout,
  ExamPrintSettings,
} from "@/lib/vocab/vocab-print-exam-config";
import {
  EXAM_COLUMN_LABELS,
  EXAM_LINE_SPACING_LABELS,
} from "@/lib/vocab/vocab-print-exam-config";

interface VocabPrintExamConfigProps {
  settings: ExamPrintSettings;
  onChange: (settings: ExamPrintSettings) => void;
  onReshuffle: () => void;
  maxPool: number;
}

const ROWS = [
  { label: "단어제시", mc: "word_mc" as const, sa: "word_sa" as const },
  { label: "의미제시", mc: "meaning_mc" as const, sa: "meaning_sa" as const },
  { label: "예문제시", mc: "example_mc" as const, sa: "example_sa" as const },
];

const COLUMNS: ExamColumnCount[] = [1, 2, 3, 4];
const SPACINGS: ExamLineSpacing[] = ["compact", "normal", "wide"];

export function VocabPrintExamConfig({
  settings,
  onChange,
  onReshuffle,
  maxPool,
}: VocabPrintExamConfigProps) {
  const { counts, layout } = settings;

  function setCounts(next: ExamPrintConfig) {
    onChange({ ...settings, counts: next });
  }

  function setLayout(next: Partial<ExamPrintLayout>) {
    onChange({
      ...settings,
      layout: { ...layout, ...next },
      shuffleSeed: layout.shuffle !== next.shuffle ? Date.now() : settings.shuffleSeed,
    });
  }

  function setCount(key: keyof ExamPrintConfig, raw: string) {
    const n = Number.parseInt(raw, 10);
    const value = Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 0;
    setCounts({ ...counts, [key]: value });
  }

  return (
    <div className="w-full space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-600">
        시험지 문항 수 (세트 단어 {maxPool}개 · 예문은 단어·의미 다음 1단 출력)
      </p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="pb-2 text-left font-medium" />
            <th className="pb-2 text-center font-semibold">객관식</th>
            <th className="pb-2 text-center font-semibold">주관식</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label}>
              <td className="py-1.5 pr-3 font-medium text-slate-700">{row.label}</td>
              <td className="px-1 py-1.5 text-center">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={counts[row.mc] || ""}
                  onChange={(e) => setCount(row.mc, e.target.value)}
                  className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                />
              </td>
              <td className="px-1 py-1.5 text-center">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={counts[row.sa] || ""}
                  onChange={(e) => setCount(row.sa, e.target.value)}
                  className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <span className="text-xs font-semibold text-slate-600">
          단 구성 (단어·의미)
        </span>
        {COLUMNS.map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => setLayout({ columns: col })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              layout.columns === col
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-300"
            }`}
          >
            {EXAM_COLUMN_LABELS[col]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">문항 간격</span>
        {SPACINGS.map((spacing) => (
          <button
            key={spacing}
            type="button"
            onClick={() => setLayout({ lineSpacing: spacing })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              layout.lineSpacing === spacing
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-300"
            }`}
          >
            {EXAM_LINE_SPACING_LABELS[spacing]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={layout.shuffle}
            onChange={(e) => setLayout({ shuffle: e.target.checked })}
            className="rounded border-slate-300"
          />
          문항 순서 랜덤
        </label>
        <button
          type="button"
          onClick={onReshuffle}
          className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-200"
        >
          순서 다시 섞기
        </button>
      </div>
    </div>
  );
}
