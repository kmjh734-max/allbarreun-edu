export type TreeLeaf = {
  type: "leaf";
  id: string;
  label: string;
  searchText?: string;
};

export type TreeGroup = {
  type: "group";
  id: string;
  label: string;
  children: TreeNode[];
  searchText?: string;
};

export type TreeNode = TreeLeaf | TreeGroup;

export function isTreeGroup(node: TreeNode): node is TreeGroup {
  return node.type === "group";
}

export function collectLeafIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type === "leaf") {
      ids.push(node.id);
    } else {
      ids.push(...collectLeafIds(node.children));
    }
  }
  return ids;
}

export function findLeafLabel(
  nodes: TreeNode[],
  leafId: string
): string | undefined {
  for (const node of nodes) {
    if (node.type === "leaf") {
      if (node.id === leafId) return node.label;
    } else {
      const found = findLeafLabel(node.children, leafId);
      if (found) return found;
    }
  }
  return undefined;
}
