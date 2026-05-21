import { matchesSearch, normalizeSearchQuery } from "@/lib/ui/filter-by-search";
import type { TreeGroup, TreeNode } from "@/lib/ui/tree-types";

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return nodes;

  return nodes.flatMap((node): TreeNode[] => {
    if (node.type === "leaf") {
      return matchesSearch(normalized, node.label, node.searchText)
        ? [node]
        : [];
    }

    const childFiltered = filterTree(node.children, query);
    if (childFiltered.length > 0) {
      return [{ ...node, children: childFiltered } satisfies TreeGroup];
    }
    if (matchesSearch(normalized, node.label, node.searchText)) {
      return [node];
    }
    return [];
  });
}

export function collectExpandedGroupIds(
  nodes: TreeNode[],
  prefix = ""
): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type === "group") {
      const gid = prefix ? `${prefix}/${node.id}` : node.id;
      ids.push(gid);
      ids.push(...collectExpandedGroupIds(node.children, gid));
    }
  }
  return ids;
}
