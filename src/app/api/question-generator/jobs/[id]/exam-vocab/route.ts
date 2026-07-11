import { jsonError, jsonOk, requireStaffProfile } from "@/lib/question-generator/api-helpers";
import {
  diversifyJobHardWords,
  syncExamVocabSetFromJob,
} from "@/lib/question-generator/exam-vocab";
import { createClient } from "@/lib/supabase/server";

/** 인쇄용: 변형문제 job → 보기 단어장 동기화 후 vocabSetId 반환 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireStaffProfile();
    const { id } = await ctx.params;
    const supabase = await createClient();

    let q = supabase
      .from("question_generation_jobs")
      .select("id, created_by, vocab_set_id, total_completed")
      .eq("id", id);
    if (profile.role === "teacher") {
      q = q.eq("created_by", profile.id);
    }
    const { data: job, error } = await q.maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!job) return jsonError("작업을 찾을 수 없습니다.", 404);

    try {
      await diversifyJobHardWords(id);
    } catch {
      /* ignore diversify errors; sync still useful */
    }
    const setId = await syncExamVocabSetFromJob(id);
    return jsonOk({
      vocabSetId: setId ?? job.vocab_set_id ?? null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(
      e instanceof Error ? e.message : "단어장 동기화 실패",
      500
    );
  }
}
