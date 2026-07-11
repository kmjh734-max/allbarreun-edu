import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabItem, VocabSet } from "@/types/database";
import type { VocabPrintSection } from "@/lib/vocab/vocab-print-types";

export interface VocabSetPrintData {
  set: VocabSet;
  items: VocabItem[];
}

export async function loadVocabSetPrintData(
  supabase: SupabaseClient,
  setId: string,
  teacherScopeId?: string
): Promise<VocabSetPrintData | null> {
  let query = supabase.from("vocab_sets").select("*").eq("id", setId);

  if (teacherScopeId) {
    query = query.or(
      `teacher_id.eq.${teacherScopeId},created_by.eq.${teacherScopeId}`
    );
  }

  const [{ data: set }, { data: items }] = await Promise.all([
    query.single(),
    supabase
      .from("vocab_items")
      .select(
        "id, set_id, word, meaning, part_of_speech, example_sentence, example_meaning, synonyms, antonyms, order_index, created_at"
      )
      .eq("set_id", setId)
      .order("order_index")
      .order("created_at"),
  ]);
  if (!set) return null;

  return {
    set: set as VocabSet,
    items: (items ?? []) as VocabItem[],
  };
}

export async function loadVocabSetsPrintData(
  supabase: SupabaseClient,
  setIds: string[],
  teacherScopeId?: string
): Promise<VocabPrintSection[]> {
  const uniqueIds = [...new Set(setIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  let setsQuery = supabase.from("vocab_sets").select("*").in("id", uniqueIds);
  if (teacherScopeId) {
    setsQuery = setsQuery.or(
      `teacher_id.eq.${teacherScopeId},created_by.eq.${teacherScopeId}`
    );
  }

  const { data: sets } = await setsQuery;
  if (!sets?.length) return [];

  const allowedSetIds = sets.map((s) => s.id as string);
  const { data: items } = await supabase
    .from("vocab_items")
    .select(
      "id, set_id, word, meaning, part_of_speech, example_sentence, example_meaning, synonyms, antonyms, order_index, created_at"
    )
    .in("set_id", allowedSetIds)
    .order("order_index")
    .order("created_at");

  const itemsBySet = new Map<string, VocabItem[]>();
  for (const item of items ?? []) {
    const sid = item.set_id as string;
    const list = itemsBySet.get(sid) ?? [];
    list.push(item as VocabItem);
    itemsBySet.set(sid, list);
  }

  const setById = new Map(sets.map((s) => [s.id as string, s as VocabSet]));
  const sections: VocabPrintSection[] = [];

  for (const setId of uniqueIds) {
    const set = setById.get(setId);
    const setItems = itemsBySet.get(setId);
    if (!set || !setItems?.length) continue;
    sections.push({
      setId: set.id,
      title: set.title,
      description: set.description,
      items: setItems,
    });
  }

  return sections;
}
