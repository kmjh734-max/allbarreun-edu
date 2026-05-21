"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  collectExpandedGroupIds,
  filterTree,
} from "@/lib/ui/filter-tree";
import {
  collectLeafIds,
  findLeafLabel,
  type TreeNode,
} from "@/lib/ui/tree-types";
import { normalizeSearchQuery } from "@/lib/ui/filter-by-search";

interface SearchableTreePickerProps {
  label: string;
  tree: TreeNode[];
  value: string;
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  emptyLabel?: string;
  required?: boolean;
  /** 테이블 필터용: 그룹·학생 선택 시 표시 대상 id 목록 */
  filterMode?: boolean;
  onFilterChange?: (leafIds: string[] | null) => void;
}

export function SearchableTreePicker({
  label,
  tree,
  value,
  onChange,
  searchPlaceholder = "검색",
  emptyLabel = "선택",
  required = false,
  filterMode = false,
  onFilterChange,
}: SearchableTreePickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterLabel, setFilterLabel] = useState<string | null>(null);

  const filteredTree = useMemo(
    () => filterTree(tree, query),
    [tree, query]
  );

  const displayLabel = useMemo(() => {
    if (filterMode) {
      return filterLabel ?? emptyLabel;
    }
    if (!value) return emptyLabel;
    return findLeafLabel(tree, value) ?? emptyLabel;
  }, [tree, value, emptyLabel, filterMode, filterLabel]);

  useEffect(() => {
    if (!open) return;
    const normalized = normalizeSearchQuery(query);
    if (normalized) {
      setExpanded(new Set(collectExpandedGroupIds(filteredTree)));
    }
  }, [open, query, filteredTree]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function toggleExpand(groupKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  function selectLeaf(leafId: string, leafLabel: string) {
    onChange(leafId);
    if (filterMode) {
      setFilterLabel(leafLabel);
      onFilterChange?.([leafId]);
    }
    setOpen(false);
    setQuery("");
  }

  function selectGroup(node: TreeNode, groupKey: string) {
    if (!filterMode || node.type !== "group") {
      toggleExpand(groupKey);
      return;
    }
    const ids = collectLeafIds(node.children);
    onChange("");
    setFilterLabel(`${node.label} (${ids.length}명)`);
    onFilterChange?.(ids.length > 0 ? ids : null);
    setOpen(false);
    setQuery("");
  }

  function clearSelection() {
    onChange("");
    setFilterLabel(null);
    onFilterChange?.(null);
    setQuery("");
  }

  function renderNodes(nodes: TreeNode[], depth = 0, prefix = ""): React.ReactNode {
    return nodes.map((node) => {
      if (node.type === "leaf") {
        const selected = value === node.id;
        return (
          <button
            key={node.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => selectLeaf(node.id, node.label)}
            className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-brand-50 ${
              selected ? "bg-brand-100 font-medium text-brand-900" : "text-slate-800"
            }`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {node.label}
          </button>
        );
      }

      const groupKey = prefix ? `${prefix}/${node.id}` : node.id;
      const isExpanded = expanded.has(groupKey) || normalizeSearchQuery(query) !== "";

      return (
        <div key={groupKey}>
          <button
            type="button"
            onClick={() => selectGroup(node, groupKey)}
            className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            <span
              className="inline-block w-4 shrink-0 text-slate-400"
              aria-hidden
            >
              {isExpanded ? "▾" : "▸"}
            </span>
            {node.label}
            <span className="ml-1 text-xs font-normal text-slate-400">
              ({node.children.length})
            </span>
          </button>
          {isExpanded && (
            <div>{renderNodes(node.children, depth + 1, groupKey)}</div>
          )}
        </div>
      );
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={value ? "text-slate-900" : "text-slate-500"}>
          {displayLabel}
        </span>
        <span className="text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div
            id={listId}
            role="listbox"
            className="max-h-64 overflow-y-auto p-1"
          >
            <button
              type="button"
              role="option"
              onClick={clearSelection}
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-50"
            >
              {emptyLabel}
            </button>
            {filteredTree.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-500">
                검색 결과가 없습니다.
              </p>
            ) : (
              renderNodes(filteredTree)
            )}
          </div>
        </div>
      )}

      {required && (
        <input
          tabIndex={-1}
          className="sr-only"
          required
          value={value}
          onChange={() => {}}
          aria-hidden
        />
      )}
    </div>
  );
}
