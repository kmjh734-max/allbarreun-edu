"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BulkPasteModal } from "@/components/vocab/BulkPasteModal";
import {
  mergeParsedRows,
  parseBulkPaste,
} from "@/lib/vocab/parse-bulk-paste";
import {
  fetchGeneratedExamples,
  type ExampleLevel,
} from "@/lib/vocab/generate-examples-client";
import {
  fetchGeneratedRelatedWords,
  type RelatedWordsKind,
} from "@/lib/vocab/generate-related-words-client";
import type { VocabItem } from "@/types/database";

export interface VocabEditorRow {
  rowKey: string;
  id?: string;
  word: string;
  meaning: string;
  example_sentence: string;
  example_meaning: string;
  synonyms: string;
  antonyms: string;
}

function newRowKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function itemsToRows(items: VocabItem[]): VocabEditorRow[] {
  return items.map((item) => ({
    rowKey: item.id,
    id: item.id,
    word: item.word,
    meaning: item.meaning,
    example_sentence: item.example_sentence ?? "",
    example_meaning: item.example_meaning ?? "",
    synonyms: item.synonyms ?? "",
    antonyms: item.antonyms ?? "",
  }));
}

function emptyRow(): VocabEditorRow {
  return {
    rowKey: newRowKey(),
    word: "",
    meaning: "",
    example_sentence: "",
    example_meaning: "",
    synonyms: "",
    antonyms: "",
  };
}

function rowNumber(index: number) {
  return String(index + 1).padStart(3, "0");
}

function AiSparkleButton({
  title,
  disabled,
  loading,
  onClick,
}: {
  title: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
    >
      {loading ? (
        <span className="text-xs">…</span>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      )}
    </button>
  );
}

interface VocabTableEditorProps {
  setId: string;
  initialItems: VocabItem[];
  initialImportOpen?: boolean;
  onSave: (
    setId: string,
    items: {
      id?: string;
      word: string;
      meaning: string;
      example_sentence?: string;
      example_meaning?: string;
      synonyms?: string;
      antonyms?: string;
      order_index: number;
    }[]
  ) => Promise<{ ok: boolean; message: string }>;
}

export function VocabTableEditor({
  setId,
  initialItems,
  initialImportOpen = false,
  onSave,
}: VocabTableEditorProps) {
  const router = useRouter();
  const [rows, setRows] = useState<VocabEditorRow[]>(() =>
    initialItems.length > 0 ? itemsToRows(initialItems) : [emptyRow(), emptyRow(), emptyRow()]
  );
  const [pasteOpen, setPasteOpen] = useState(initialImportOpen);
  const [autoAi, setAutoAi] = useState(true);
  const [exampleLevel, setExampleLevel] = useState<ExampleLevel>("middle");
  const [saving, setSaving] = useState(false);
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [bulkAiLoading, setBulkAiLoading] = useState(false);
  const [bulkRelatedLoading, setBulkRelatedLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useLayoutEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const update = () => setTableScrollWidth(el.scrollWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows]);

  const syncScrollFromTop = useCallback(() => {
    const main = tableScrollRef.current;
    const top = topScrollRef.current;
    if (main && top) main.scrollLeft = top.scrollLeft;
  }, []);

  const syncScrollFromTable = useCallback(() => {
    const main = tableScrollRef.current;
    const top = topScrollRef.current;
    if (main && top) top.scrollLeft = main.scrollLeft;
  }, []);

  useEffect(() => {
    if (initialImportOpen) setPasteOpen(true);
  }, [initialImportOpen]);

  const updateRow = useCallback(
    (rowKey: string, field: keyof VocabEditorRow, value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.rowKey === rowKey ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const removeRow = useCallback((rowKey: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.rowKey !== rowKey);
      return next.length > 0 ? next : [emptyRow()];
    });
  }, []);

  const insertRowAfter = useCallback((afterKey: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.rowKey === afterKey);
      const row = emptyRow();
      if (idx === -1) return [...prev, row];
      const next = [...prev];
      next.splice(idx + 1, 0, row);
      return next;
    });
  }, []);

  const applyParsedRows = useCallback(
    (parsed: ReturnType<typeof parseBulkPaste>) => {
      const { merged, duplicates } = mergeParsedRows(rows, parsed);
      if (merged.length === 0) {
        return { added: 0, duplicates };
      }
      setRows((prev) => {
        const cleaned = prev.filter((r) => r.word.trim() || r.meaning.trim());
        const base = cleaned.length > 0 ? cleaned : [];
        const added = merged.map((p) => ({
          rowKey: newRowKey(),
          word: p.word,
          meaning: p.meaning,
          example_sentence: p.example_sentence,
          example_meaning: p.example_meaning,
          synonyms: "",
          antonyms: "",
        }));
        return [...base, ...added];
      });
      return { added: merged.length, duplicates };
    },
    [rows]
  );

  const applyGeneratedExamples = useCallback(
    (
      updates: {
        rowKey: string;
        example_sentence: string;
        example_meaning: string;
      }[]
    ) => {
      setRows((prev) =>
        prev.map((r) => {
          const u = updates.find((x) => x.rowKey === r.rowKey);
          if (!u) return r;
          return {
            ...r,
            example_sentence: u.example_sentence,
            example_meaning: u.example_meaning,
          };
        })
      );
    },
    []
  );

  const applyGeneratedRelated = useCallback(
    (
      updates: {
        rowKey: string;
        synonyms?: string;
        antonyms?: string;
      }[],
      kind: RelatedWordsKind
    ) => {
      setRows((prev) =>
        prev.map((r) => {
          const u = updates.find((x) => x.rowKey === r.rowKey);
          if (!u) return r;
          return {
            ...r,
            synonyms:
              kind === "antonyms" ? r.synonyms : (u.synonyms ?? r.synonyms),
            antonyms:
              kind === "synonyms" ? r.antonyms : (u.antonyms ?? r.antonyms),
          };
        })
      );
    },
    []
  );

  const generateForRow = useCallback(
    async (rowKey: string, force = false) => {
      const row = rows.find((r) => r.rowKey === rowKey);
      if (!row?.word.trim() || !row.meaning.trim()) return;
      if (!force && row.example_sentence.trim()) return;

      setAiLoadingKey(`${rowKey}-example`);
      const result = await fetchGeneratedExamples(
        [{ word: row.word.trim(), meaning: row.meaning.trim() }],
        exampleLevel
      );
      setAiLoadingKey(null);

      if (!result.ok) {
        setStatus(result.message);
        return;
      }

      const gen = result.items[0];
      if (gen?.example_sentence) {
        applyGeneratedExamples([
          {
            rowKey,
            example_sentence: gen.example_sentence,
            example_meaning: gen.example_meaning ?? "",
          },
        ]);
      }
    },
    [rows, exampleLevel, applyGeneratedExamples]
  );

  const generateRelatedForRow = useCallback(
    async (rowKey: string) => {
      const row = rows.find((r) => r.rowKey === rowKey);
      if (!row?.word.trim() || !row.meaning.trim()) return;

      setAiLoadingKey(`${rowKey}-related`);
      const result = await fetchGeneratedRelatedWords(
        [{ word: row.word.trim(), meaning: row.meaning.trim() }],
        "both"
      );
      setAiLoadingKey(null);

      if (!result.ok) {
        setStatus(result.message);
        return;
      }

      const gen = result.items[0];
      if (!gen) return;

      applyGeneratedRelated(
        [
          {
            rowKey,
            synonyms: gen.synonyms,
            antonyms: gen.antonyms,
          },
        ],
        "both"
      );
    },
    [rows, applyGeneratedRelated]
  );

  const generateAllSynonymsAntonyms = useCallback(async () => {
    const targets = rows.filter(
      (r) =>
        r.word.trim() &&
        r.meaning.trim() &&
        (!r.synonyms.trim() || !r.antonyms.trim())
    );
    if (targets.length === 0) {
      setStatus("동의어·반의어가 모두 채워진 단어만 있습니다.");
      return;
    }

    setBulkRelatedLoading(true);
    setStatus(null);
    const result = await fetchGeneratedRelatedWords(
      targets.map((t) => ({
        word: t.word.trim(),
        meaning: t.meaning.trim(),
      })),
      "both"
    );
    setBulkRelatedLoading(false);

    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    const byWord = new Map(
      result.items.map((i) => [i.word.trim().toLowerCase(), i])
    );
    const updates = targets
      .map((t) => {
        const gen = byWord.get(t.word.trim().toLowerCase());
        if (!gen) return null;
        if (!gen.synonyms?.trim() && !gen.antonyms?.trim()) return null;
        return {
          rowKey: t.rowKey,
          synonyms: gen.synonyms,
          antonyms: gen.antonyms,
        };
      })
      .filter(Boolean) as {
      rowKey: string;
      synonyms: string;
      antonyms: string;
    }[];

    applyGeneratedRelated(updates, "both");
    setStatus(`${updates.length}개 단어에 동의어·반의어가 생성되었습니다.`);
  }, [rows, applyGeneratedRelated]);

  const generateAllEmptyExamples = useCallback(async () => {
    const targets = rows.filter(
      (r) =>
        r.word.trim() &&
        r.meaning.trim() &&
        !r.example_sentence.trim() &&
        !r.example_meaning.trim()
    );
    if (targets.length === 0) {
      setStatus("예문이 비어 있는 단어가 없습니다.");
      return;
    }

    setBulkAiLoading(true);
    setStatus(null);
    const result = await fetchGeneratedExamples(
      targets.map((t) => ({
        word: t.word.trim(),
        meaning: t.meaning.trim(),
      })),
      exampleLevel
    );
    setBulkAiLoading(false);

    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    const byWord = new Map(
      result.items.map((i) => [i.word.trim().toLowerCase(), i])
    );
    const updates = targets
      .map((t) => {
        const gen = byWord.get(t.word.trim().toLowerCase());
        if (!gen?.example_sentence) return null;
        return {
          rowKey: t.rowKey,
          example_sentence: gen.example_sentence,
          example_meaning: gen.example_meaning ?? "",
        };
      })
      .filter(Boolean) as {
      rowKey: string;
      example_sentence: string;
      example_meaning: string;
    }[];

    applyGeneratedExamples(updates);
    setStatus(`${updates.length}개 단어에 예문이 생성되었습니다.`);
  }, [rows, exampleLevel, applyGeneratedExamples]);

  const aiBusy = bulkAiLoading || bulkRelatedLoading;

  const handleMeaningBlur = useCallback(
    (rowKey: string) => {
      if (!autoAi) return;
      const row = rows.find((r) => r.rowKey === rowKey);
      if (
        row?.word.trim() &&
        row.meaning.trim() &&
        !row.example_sentence.trim()
      ) {
        void generateForRow(rowKey);
      }
    },
    [autoAi, rows, generateForRow]
  );

  const filledCount = useMemo(
    () => rows.filter((r) => r.word.trim() && r.meaning.trim()).length,
    [rows]
  );

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const payload = rows
      .map((r, index) => ({
        id: r.id,
        word: r.word.trim(),
        meaning: r.meaning.trim(),
        example_sentence: r.example_sentence.trim() || undefined,
        example_meaning: r.example_meaning.trim() || undefined,
        synonyms: r.synonyms.trim() || undefined,
        antonyms: r.antonyms.trim() || undefined,
        order_index: index,
      }))
      .filter((r) => r.word && r.meaning);

    if (payload.length === 0) {
      setStatus("저장할 단어가 없습니다. 단어와 뜻을 입력해 주세요.");
      setSaving(false);
      return;
    }

    const result = await onSave(setId, payload);
    setStatus(result.message);
    setSaving(false);

    if (result.ok) router.refresh();
  }

  const inputClass =
    "w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <label className="text-xs font-medium text-slate-600">예문 수준</label>
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
          value={exampleLevel}
          onChange={(e) => setExampleLevel(e.target.value as ExampleLevel)}
          disabled={aiBusy || saving}
        >
          <option value="middle">중등</option>
          <option value="high">고등</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={autoAi}
            onChange={(e) => setAutoAi(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600"
          />
          예문 자동입력 (AI)
        </label>
        <span className="hidden h-4 w-px bg-slate-300 sm:inline" />
        <button
          type="button"
          disabled={bulkAiLoading || saving}
          onClick={generateAllEmptyExamples}
          className="rounded bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-200 disabled:opacity-50"
        >
          {bulkAiLoading ? "생성 중..." : "AI 예문 일괄"}
        </button>
        <button
          type="button"
          disabled={bulkRelatedLoading || saving}
          onClick={generateAllSynonymsAntonyms}
          className="rounded bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-200 disabled:opacity-50"
        >
          {bulkRelatedLoading ? "생성 중..." : "AI 동의어·반의어 일괄"}
        </button>
      </div>

      <div
        ref={topScrollRef}
        onScroll={syncScrollFromTop}
        className="overflow-x-auto overflow-y-hidden border-b border-slate-100"
        aria-hidden
      >
        <div style={{ width: tableScrollWidth, height: 10 }} />
      </div>

      <div
        ref={tableScrollRef}
        onScroll={syncScrollFromTable}
        className="max-h-[min(68vh,640px)] overflow-auto"
      >
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-600 text-white">
              <th className="w-[72px] px-1.5 py-1.5 text-center text-xs font-semibold" />
              <th className="min-w-[100px] px-2 py-1.5 text-left text-xs font-semibold">
                단어
              </th>
              <th className="min-w-[110px] px-2 py-1.5 text-left text-xs font-semibold">
                뜻
              </th>
              <th className="min-w-[170px] px-2 py-1.5 text-left text-xs font-semibold">
                예문
              </th>
              <th className="min-w-[150px] px-2 py-1.5 text-left text-xs font-semibold">
                예문 해석
              </th>
              <th className="min-w-[150px] px-2 py-1.5 text-left text-xs font-semibold">
                동의어 · 반의어
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.rowKey}
                className="border-b border-slate-100 hover:bg-slate-50/60"
              >
                <td className="align-top px-1.5 py-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-mono text-slate-500">
                      {rowNumber(index)}
                    </span>
                    <button
                      type="button"
                      title="행 삭제"
                      onClick={() => removeRow(row.rowKey)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-base font-bold leading-none text-white hover:bg-red-600"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      title="행 추가"
                      onClick={() => insertRowAfter(row.rowKey)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-base font-bold leading-none text-white hover:bg-violet-600"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-1.5 py-1 align-top">
                  <input
                    className={inputClass}
                    value={row.word}
                    onChange={(e) =>
                      updateRow(row.rowKey, "word", e.target.value)
                    }
                    placeholder="provide"
                  />
                </td>
                <td className="px-1.5 py-1 align-top">
                  <input
                    className={inputClass}
                    value={row.meaning}
                    onChange={(e) =>
                      updateRow(row.rowKey, "meaning", e.target.value)
                    }
                    onBlur={() => handleMeaningBlur(row.rowKey)}
                    placeholder="제공하다"
                  />
                </td>
                <td className="px-1.5 py-1 align-top">
                  <div className="relative">
                    <input
                      className={`${inputClass} pr-8`}
                      value={row.example_sentence}
                      onChange={(e) =>
                        updateRow(row.rowKey, "example_sentence", e.target.value)
                      }
                      placeholder="The school provides lunch."
                    />
                    <AiSparkleButton
                      title="AI 예문 생성"
                      disabled={!row.word.trim() || !row.meaning.trim()}
                      loading={aiLoadingKey === `${row.rowKey}-example`}
                      onClick={() => generateForRow(row.rowKey, true)}
                    />
                  </div>
                </td>
                <td className="px-1.5 py-1 align-top">
                  <input
                    className={inputClass}
                    value={row.example_meaning}
                    onChange={(e) =>
                      updateRow(row.rowKey, "example_meaning", e.target.value)
                    }
                    placeholder="학교는 점심을 제공한다."
                  />
                </td>
                <td className="px-1.5 py-1 align-top">
                  <div className="relative pr-8">
                    <input
                      className={`${inputClass} mb-1`}
                      value={row.synonyms}
                      onChange={(e) =>
                        updateRow(row.rowKey, "synonyms", e.target.value)
                      }
                      placeholder="동의어"
                    />
                    <input
                      className={inputClass}
                      value={row.antonyms}
                      onChange={(e) =>
                        updateRow(row.rowKey, "antonyms", e.target.value)
                      }
                      placeholder="반의어"
                    />
                    <AiSparkleButton
                      title="AI 동의어·반의어 생성"
                      disabled={!row.word.trim() || !row.meaning.trim()}
                      loading={aiLoadingKey === `${row.rowKey}-related`}
                      onClick={() => generateRelatedForRow(row.rowKey)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            행 추가
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="rounded-lg bg-[#7cb518] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#6aa014]"
          >
            자료 가져오기
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            입력된 단어 {filledCount}개
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-brand-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {status && (
        <p
          className={`border-t px-3 py-1.5 text-xs ${
            status.includes("되었") || status.includes("생성")
              ? "text-green-700"
              : "text-red-600"
          }`}
          role="status"
        >
          {status}
        </p>
      )}

      <BulkPasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onApplyRows={applyParsedRows}
      />
    </div>
  );
}
