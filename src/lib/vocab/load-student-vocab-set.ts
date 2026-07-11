import type { SupabaseClient } from "@supabase/supabase-js";
import { loadStageProgress } from "@/lib/vocab/load-stage-progress";
import { isStudentAssignedToVocabSet } from "@/lib/vocab/student-assignment";
import type { VocabItem, VocabSet } from "@/types/database";

export type VocabItemsLoad =
  | "none"
  | "stage1"
  | "stage2"
  | "stage3"
  | "stage4"
  | "full";

export type VocabProgressLoad = "hub" | "stage1" | "full";

export interface LoadStudentVocabSetOptions {
  items?: VocabItemsLoad;
  progress?: VocabProgressLoad;
}

async function fetchVocabItems(
  supabase: SupabaseClient,
  setId: string,
  itemsLoad: VocabItemsLoad
): Promise<{ items: VocabItem[]; itemCount: number }> {
  if (itemsLoad === "none") {
    const { count } = await supabase
      .from("vocab_items")
      .select("id", { count: "exact", head: true })
      .eq("set_id", setId);
    return { items: [], itemCount: count ?? 0 };
  }

  if (itemsLoad === "full") {
    const { data } = await supabase
      .from("vocab_items")
      .select("*")
      .eq("set_id", setId)
      .order("order_index")
      .order("created_at");
    const items = (data ?? []) as VocabItem[];
    return { items, itemCount: items.length };
  }

  if (itemsLoad === "stage1") {
    const { data } = await supabase
      .from("vocab_items")
      .select(
        "id, set_id, word, meaning, example_sentence, example_meaning, order_index, created_at"
      )
      .eq("set_id", setId)
      .order("order_index")
      .order("created_at");
    const items = (data ?? []) as VocabItem[];
    return { items, itemCount: items.length };
  }

  if (itemsLoad === "stage2") {
    const { data } = await supabase
      .from("vocab_items")
      .select("id, word, meaning, order_index, created_at")
      .eq("set_id", setId)
      .order("order_index")
      .order("created_at");
    const items = (data ?? []) as VocabItem[];
    return { items, itemCount: items.length };
  }

  if (itemsLoad === "stage3") {
    const { data } = await supabase
      .from("vocab_items")
      .select("id, word, example_sentence, example_meaning, order_index, created_at")
      .eq("set_id", setId)
      .order("order_index")
      .order("created_at");
    const items = (data ?? []) as VocabItem[];
    return { items, itemCount: items.length };
  }

  const { data } = await supabase
    .from("vocab_items")
    .select("id, word, meaning, order_index, created_at")
    .eq("set_id", setId)
    .order("order_index")
    .order("created_at");
  const items = (data ?? []) as VocabItem[];
  return { items, itemCount: items.length };
}

export async function loadStudentVocabSetContext(
  supabase: SupabaseClient,
  studentId: string,
  setId: string,
  options: LoadStudentVocabSetOptions = { items: "full", progress: "full" }
) {
  const itemsLoad = options.items ?? "full";
  const progressLoad = options.progress ?? "full";

  const [{ data: set, error: setError }, assigned, itemsResult, progress] =
    await Promise.all([
      supabase
        .from("vocab_sets")
        .select("id, title, exam_compact")
        .eq("id", setId)
        .maybeSingle(),
      isStudentAssignedToVocabSet(supabase, studentId, setId),
      fetchVocabItems(supabase, setId, itemsLoad),
      loadStageProgress(supabase, studentId, setId, {
        createIfMissing: false,
        fields: progressLoad,
      }),
    ]);

  if (setError || !set || !assigned) return null;

  return {
    set: set as VocabSet,
    items: itemsResult.items,
    itemCount: itemsResult.itemCount,
    progress,
  };
}
