"use client";

import { useState } from "react";
import { fetchPassageVocabulary } from "@/lib/vocab/extract-passage-client";
import {
  parseBulkPaste,
  type ParsedVocabRow,
} from "@/lib/vocab/parse-bulk-paste";

type ImportMode = "paste" | "passage";

interface BulkPasteModalProps {
  open: boolean;
  onClose: () => void;
  onApplyRows: (rows: ParsedVocabRow[]) => { added: number; duplicates: string[] };
}

export function BulkPasteModal({
  open,
  onClose,
  onApplyRows,
}: BulkPasteModalProps) {
  const [mode, setMode] = useState<ImportMode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [passageText, setPassageText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function finishApply(result: { added: number; duplicates: string[] }) {
    setHint(
      result.duplicates.length > 0
        ? `${result.added}개 추가됨. 중복 제외: ${result.duplicates.join(", ")}`
        : `${result.added}개 단어가 추가되었습니다.`
    );
    if (result.added > 0) {
      if (mode === "paste") setPasteText("");
      else setPassageText("");
      setTimeout(() => {
        setHint(null);
        onClose();
      }, 1200);
    }
  }

  function handlePasteApply() {
    const parsed = parseBulkPaste(pasteText);
    if (parsed.length === 0) {
      setHint(
        "붙여넣은 내용에서 단어를 찾지 못했습니다. 영어 단어 뒤에 한글 뜻이 오는지, 탭 구분을 확인해 주세요."
      );
      return;
    }
    finishApply(onApplyRows(parsed));
  }

  async function handlePassageApply() {
    const trimmed = passageText.trim();
    if (trimmed.length < 30) {
      setHint("지문이 너무 짧습니다. 영어 지문을 더 입력해 주세요.");
      return;
    }

    setLoading(true);
    setHint(null);
    const result = await fetchPassageVocabulary(trimmed);
    setLoading(false);

    if (!result.ok) {
      setHint(result.message);
      return;
    }

    const rows: ParsedVocabRow[] = result.items.map((item) => ({
      word: item.word,
      meaning: item.meaning,
      example_sentence: "",
      example_meaning: "",
    }));

    finishApply(onApplyRows(rows));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="relative bg-[#b8e986] px-6 py-3 text-center">
          <h2 className="text-lg font-bold text-slate-900">자료 가져오기</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-slate-700"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode("paste");
              setHint(null);
            }}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              mode === "paste"
                ? "border-b-2 border-[#7cb518] bg-white text-slate-900"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            1. 표 붙여넣기
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("passage");
              setHint(null);
            }}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              mode === "passage"
                ? "border-b-2 border-[#7cb518] bg-white text-slate-900"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            2. 지문 입력
          </button>
        </div>

        <div className="p-6">
          {mode === "paste" ? (
            <>
              <p className="text-sm text-slate-600">
                엑셀·구글시트에서 복사한 내용을 붙여넣으세요. 열 구분은 탭을
                사용하고, 한 줄에 붙여 넣을 때는 영어 단어와 한글 뜻 사이만
                나뉩니다. 뜻 안의 콤마·공백(예: 여러가지의, 다른)은 그대로
                유지됩니다.
              </p>
              <textarea
                className="ui-input mt-4 min-h-[200px] font-mono text-sm"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`단어\t뜻\nprovide\t제공하다\ndifferent\t여러가지의, 다른`}
              />
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                영어 지문을 붙여넣으면 AI가 중학교 수준 이상의 중요 단어·숙어를
                추출합니다. 동사는 원형으로 정리하고(과거형·pp·-ing → 원형),
                한글 뜻과 함께 표에 추가됩니다.
              </p>
              <textarea
                className="ui-input mt-4 min-h-[220px] text-sm leading-relaxed"
                value={passageText}
                onChange={(e) => setPassageText(e.target.value)}
                disabled={loading}
                placeholder={`영어 지문을 붙여넣으세요.\n\n예: Last summer, our class visited a science museum. We looked forward to seeing the new exhibition about space exploration...`}
              />
            </>
          )}

          {hint && (
            <p className="mt-2 text-sm text-slate-600" role="status">
              {hint}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={mode === "paste" ? handlePasteApply : handlePassageApply}
              disabled={loading}
              className="rounded-lg bg-[#7cb518] px-5 py-2 text-sm font-bold text-white hover:bg-[#6aa014] disabled:opacity-50"
            >
              {loading
                ? "추출 중..."
                : mode === "paste"
                  ? "표에 추가"
                  : "단어 추출 · 표에 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
