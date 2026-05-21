"use client";

import { useMemo, useState } from "react";
import { matchesSearch, normalizeSearchQuery } from "@/lib/ui/filter-by-search";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** 추가 검색 키워드 (이메일 등) */
  searchText?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  searchPlaceholder?: string;
  emptyOptionLabel?: string;
  required?: boolean;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  searchPlaceholder = "이름·아이디로 검색",
  emptyOptionLabel = "선택",
  required = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");

  const displayOptions = useMemo(() => {
    const normalized = normalizeSearchQuery(query);
    const filtered = normalized
      ? options.filter((opt) =>
          matchesSearch(normalized, opt.label, opt.searchText)
        )
      : options;

    const selected = options.find((opt) => opt.value === value);
    if (
      selected &&
      !filtered.some((opt) => opt.value === selected.value)
    ) {
      return [selected, ...filtered];
    }
    return filtered;
  }, [options, query, value]);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        autoComplete="off"
      />
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">{emptyOptionLabel}</option>
        {displayOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {normalizeSearchQuery(query) && displayOptions.length === 0 && (
        <p className="mt-1 text-xs text-slate-500">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}
