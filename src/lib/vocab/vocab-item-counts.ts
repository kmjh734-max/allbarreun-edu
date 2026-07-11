import type { SupabaseClient } from "@supabase/supabase-js";

/** set_id별 단어 수 (전체 vocab_items 스캔 방지) */
export async function fetchVocabItemCountsBySetIds(
  supabase: SupabaseClient,
  setIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (setIds.length === 0) return map;

  const unique = [...new Set(setIds)];
  const chunkSize = 80;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.rpc("count_vocab_items_by_set_ids", {
      set_ids: chunk,
    });

    if (error) {
      const { data: rows } = await supabase
        .from("vocab_items")
        .select("set_id")
        .in("set_id", chunk);
      for (const row of rows ?? []) {
        map.set(row.set_id, (map.get(row.set_id) ?? 0) + 1);
      }
      continue;
    }

    const list = (data ?? []) as Array<{ set_id: string; item_count: number }>;
    for (const row of list) {
      map.set(row.set_id, Number(row.item_count) || 0);
    }
  }

  for (const id of unique) {
    if (!map.has(id)) map.set(id, 0);
  }

  return map;
}
