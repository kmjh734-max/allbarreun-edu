"use client";

import {
  createEmptyVideoRow,
  type VideoDraftRow,
} from "@/lib/courses/course-lessons";
import {
  VIDEO_LINK_HELP,
  VIDEO_LINK_PLACEHOLDER,
} from "@/lib/video/parse-url";

interface VideoListEditorProps {
  rows: VideoDraftRow[];
  onChange: (rows: VideoDraftRow[]) => void;
  disabled?: boolean;
}

export function VideoListEditor({
  rows,
  onChange,
  disabled = false,
}: VideoListEditorProps) {
  function updateRow(index: number, patch: Partial<VideoDraftRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, createEmptyVideoRow()]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">영상 목록</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={addRow}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
        >
          + 영상 추가
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          영상이 없습니다. 「+ 영상 추가」로 등록하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                {index + 1}
              </span>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    동영상 제목
                  </label>
                  <input
                    required
                    disabled={disabled}
                    value={row.title}
                    onChange={(e) => updateRow(index, { title: e.target.value })}
                    placeholder="예: 문장의 형식 개념 정리"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    동영상 링크 (YouTube / Vimeo)
                  </label>
                  <input
                    required
                    disabled={disabled}
                    value={row.videoUrl}
                    onChange={(e) =>
                      updateRow(index, { videoUrl: e.target.value })
                    }
                    placeholder={VIDEO_LINK_PLACEHOLDER}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">{VIDEO_LINK_HELP}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled || rows.length <= 1}
                onClick={() => removeRow(index)}
                className="shrink-0 text-sm text-red-600 hover:underline disabled:opacity-40"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={addRow}
          className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          + 영상 추가
        </button>
      )}
    </div>
  );
}
