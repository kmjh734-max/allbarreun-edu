import {
  jsonError,
  jsonOk,
  requireStaffProfile,
} from "@/lib/question-generator/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { regenerateSingleQuestion } from "@/lib/question-generator/run-generation-job";

export const maxDuration = 300;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireStaffProfile();
    const { id } = await ctx.params;
    const supabase = await createClient();
    let q = supabase
      .from("generated_english_questions")
      .select("*")
      .eq("id", id);
    if (profile.role === "teacher") q = q.eq("created_by", profile.id);
    const { data, error } = await q.single();
    if (error || !data) return jsonError("문제를 찾을 수 없습니다.", 404);
    return jsonOk({ question: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("조회 실패", 500);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireStaffProfile();
    const { id } = await ctx.params;
    const body = await req.json();
    const supabase = await createClient();

    let existingQ = supabase
      .from("generated_english_questions")
      .select("*")
      .eq("id", id);
    if (profile.role === "teacher") {
      existingQ = existingQ.eq("created_by", profile.id);
    }
    const { data: before, error: bErr } = await existingQ.single();
    if (bErr || !before) return jsonError("문제를 찾을 수 없습니다.", 404);

    const allowed = [
      "instruction",
      "question_text",
      "passage_modified",
      "choices",
      "correct_answer",
      "acceptable_answers",
      "explanation",
      "evidence",
      "scoring_guide",
      "status",
      "difficulty",
      "choice_language",
    ] as const;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    if (body.status === "approved") {
      patch.approved_by = profile.id;
      patch.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("generated_english_questions")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    await supabase.from("question_edit_history").insert({
      question_id: id,
      before_data: before,
      after_data: patch,
      edited_by: profile.id,
    });

    return jsonOk({ question: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("수정 실패", 500);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireStaffProfile();
    const { id } = await ctx.params;
    const supabase = await createClient();
    let q = supabase.from("generated_english_questions").delete().eq("id", id);
    if (profile.role === "teacher") q = q.eq("created_by", profile.id);
    const { error } = await q;
    if (error) return jsonError(error.message, 500);
    return jsonOk({});
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("삭제 실패", 500);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffProfile();
    const { id } = await ctx.params;
    const body = (await req.json()) as { action?: string };
    if (body.action === "regenerate" || body.action === "regenerate_choices") {
      await regenerateSingleQuestion({
        questionId: id,
        mode: body.action === "regenerate_choices" ? "choices" : "full",
      });
      const supabase = await createClient();
      const { data } = await supabase
        .from("generated_english_questions")
        .select("*")
        .eq("id", id)
        .single();
      return jsonOk({ question: data });
    }
    if (body.action === "revalidate") {
      // soft: mark needs_review if score low — reuse regenerate validation path lightly
      await regenerateSingleQuestion({ questionId: id, mode: "full" });
      const supabase = await createClient();
      const { data } = await supabase
        .from("generated_english_questions")
        .select("*")
        .eq("id", id)
        .single();
      return jsonOk({ question: data });
    }
    return jsonError("알 수 없는 요청입니다.");
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(
      e instanceof Error ? e.message : "처리 실패",
      500
    );
  }
}
