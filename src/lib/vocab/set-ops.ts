import type { SupabaseClient } from "@supabase/supabase-js";
import type { VocabItem } from "@/types/database";
import { nextVocabSetOrderIndex } from "@/lib/vocab/reorder-sets";

export async function moveVocabSetToFolder(
  supabase: SupabaseClient,
  setId: string,
  folderId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("vocab_sets")
    .update({ folder_id: folderId })
    .eq("id", setId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function copyVocabSetToFolder(
  supabase: SupabaseClient,
  setId: string,
  targetFolderId: string,
  createdBy: string,
  teacherId?: string | null
): Promise<
  { ok: true; newSetId: string } | { ok: false; message: string }
> {
  const { data: source, error: sourceError } = await supabase
    .from("vocab_sets")
    .select("*")
    .eq("id", setId)
    .single();

  if (sourceError || !source) {
    return { ok: false, message: "단어장을 찾을 수 없습니다." };
  }

  const { data: items, error: itemsError } = await supabase
    .from("vocab_items")
    .select("*")
    .eq("set_id", setId)
    .order("order_index")
    .order("created_at");

  if (itemsError) return { ok: false, message: itemsError.message };

  const title = `${(source.title as string).trim()} 복사본`;
  const orderIndex = await nextVocabSetOrderIndex(supabase, targetFolderId);

  const { data: created, error: createError } = await supabase
    .from("vocab_sets")
    .insert({
      title,
      description: source.description,
      folder_id: targetFolderId,
      order_index: orderIndex,
      teacher_id: teacherId ?? source.teacher_id,
      created_by: createdBy,
      is_published: true,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return { ok: false, message: createError?.message ?? "복사에 실패했습니다." };
  }

  const itemList = (items ?? []) as VocabItem[];
  if (itemList.length > 0) {
    const { error: copyItemsError } = await supabase.from("vocab_items").insert(
      itemList.map((item, index) => ({
        set_id: created.id,
        word: item.word,
        meaning: item.meaning,
        part_of_speech: item.part_of_speech,
        example_sentence: item.example_sentence,
        example_meaning: item.example_meaning,
        order_index: item.order_index ?? index,
      }))
    );

    if (copyItemsError) {
      await supabase.from("vocab_sets").delete().eq("id", created.id);
      return { ok: false, message: copyItemsError.message };
    }
  }

  return { ok: true, newSetId: created.id as string };
}
