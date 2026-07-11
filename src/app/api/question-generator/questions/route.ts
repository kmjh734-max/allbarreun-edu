import {
  jsonError,
  jsonOk,
  requireStaffProfile,
} from "@/lib/question-generator/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const profile = await requireStaffProfile();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const supabase = await createClient();

    let q = supabase
      .from("generated_english_questions")
      .select(
        "id, category, question_type, difficulty, choice_language, instruction, question_text, status, validation_score, created_at, passage_id, option_key"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (profile.role === "teacher") q = q.eq("created_by", profile.id);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return jsonError(error.message, 500);
    return jsonOk({ questions: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("목록 조회 실패", 500);
  }
}
