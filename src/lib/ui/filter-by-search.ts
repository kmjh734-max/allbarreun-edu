export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesSearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return fields.some((field) =>
    (field ?? "").toLowerCase().includes(normalized)
  );
}
