"use client";

interface VocabFolderToolbarProps {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onMove: () => void;
  onAssign: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onPrint?: () => void;
  disabled?: boolean;
}

export function VocabFolderToolbar({
  totalCount,
  selectedCount,
  allSelected,
  onToggleAll,
  onMove,
  onAssign,
  onCopy,
  onDelete,
  onPrint,
  disabled = false,
}: VocabFolderToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-700">전체 세트</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{totalCount}개</span>
        {hasSelection && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
            {selectedCount}개 선택
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <ToolbarButton
          label="위치 이동"
          onClick={onMove}
          disabled={disabled || !hasSelection}
        />
        <ToolbarButton
          label="배정"
          onClick={onAssign}
          disabled={disabled || !hasSelection}
        />
        {onPrint ? (
          <ToolbarButton
            label="인쇄"
            onClick={onPrint}
            disabled={disabled || !hasSelection}
            accent
          />
        ) : null}
        <ToolbarButton
          label="복사"
          onClick={onCopy}
          disabled={disabled || !hasSelection}
        />
        <ToolbarButton
          label="삭제"
          onClick={onDelete}
          disabled={disabled || !hasSelection}
          danger
        />
        <label className="ml-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allSelected && totalCount > 0}
            onChange={onToggleAll}
            disabled={disabled || totalCount === 0}
            className="h-4 w-4 rounded border-slate-300"
          />
          전체 선택
        </label>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  danger,
  accent,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : accent
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "text-slate-700 hover:bg-white hover:shadow-sm"
      }`}
    >
      {label}
    </button>
  );
}
