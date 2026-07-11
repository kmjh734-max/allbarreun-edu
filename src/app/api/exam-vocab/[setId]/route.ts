import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/question-generator/api-helpers";
import { dedupeVocabItemRows } from "@/lib/question-generator/exam-vocab";
import { persistVocabItems } from "@/lib/vocab/save-items";

export const dynamic = "force-dynamic";

/** 공개: exam_compact 단어장만 (시험지 QR, 로그인 불필요) */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ setId: string }> }
) {
  try {
    const { setId } = await ctx.params;
    if (!setId) return jsonError("세트 ID가 필요합니다.", 400);

    const admin = createAdminClient();
    const { data: set, error } = await admin
      .from("vocab_sets")
      .select("id, title, exam_compact")
      .eq("id", setId)
      .maybeSingle();

    if (error || !set) return jsonError("단어장을 찾을 수 없습니다.", 404);
    if (!set.exam_compact) {
      return jsonError("시험 연계 단어장이 아닙니다.", 403);
    }

    const { data: items } = await admin
      .from("vocab_items")
      .select(
        "id, set_id, word, meaning, example_sentence, example_meaning, order_index, created_at"
      )
      .eq("set_id", setId)
      .order("order_index")
      .order("created_at");

    const raw = items ?? [];
    const unique = dedupeVocabItemRows(raw);

    // 이미 쌓인 중복이 있으면 DB도 정리 (다음 학습부터 카드 수 일치)
    if (unique.length < raw.length) {
      await persistVocabItems(
        admin,
        setId,
        unique.map((row, i) => ({
          word: row.word,
          meaning: row.meaning,
          example_sentence: row.example_sentence ?? undefined,
          example_meaning: row.example_meaning ?? undefined,
          order_index: i,
        }))
      );
      const { data: refreshed } = await admin
        .from("vocab_items")
        .select(
          "id, set_id, word, meaning, example_sentence, example_meaning, order_index, created_at"
        )
        .eq("set_id", setId)
        .order("order_index")
        .order("created_at");
      return jsonOk({
        set: { id: set.id, title: set.title || "보기 단어" },
        items: refreshed ?? unique,
      });
    }

    return jsonOk({
      set: { id: set.id, title: set.title || "보기 단어" },
      items: unique,
    });
  } catch {
    return jsonError("불러오기에 실패했습니다.", 500);
  }
}
