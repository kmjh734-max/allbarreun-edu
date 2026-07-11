import {
  jsonError,
  jsonOk,
  requireStaffProfile,
} from "@/lib/question-generator/api-helpers";
import { runGenerationJob } from "@/lib/question-generator/run-generation-job";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireStaffProfile();
    const { id } = await ctx.params;
    const supabase = await createClient();

    let jobQuery = supabase
      .from("question_generation_jobs")
      .select("*, english_source_passages(*)")
      .eq("id", id);

    if (profile.role === "teacher") {
      jobQuery = jobQuery.eq("created_by", profile.id);
    }

    const { data: job, error } = await jobQuery.single();
    if (error || !job) return jsonError("작업을 찾을 수 없습니다.", 404);

    let qQuery = supabase
      .from("generated_english_questions")
      .select("*")
      .eq("generation_job_id", id)
      .order("created_at", { ascending: true });

    if (profile.role === "teacher") {
      qQuery = qQuery.eq("created_by", profile.id);
    }

    const { data: questions } = await qQuery;
    return jsonOk({ job, questions: questions ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("조회에 실패했습니다.", 500);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffProfile();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === "process" || body.action === "retry") {
      const supabase = await createClient();
      if (body.action === "retry") {
        await supabase
          .from("question_generation_jobs")
          .update({
            status: "pending",
            error_message: null,
            progress_message: "재시도 대기",
            completed_at: null,
            total_completed: 0,
            total_failed: 0,
          })
          .eq("id", id)
          .in("status", ["failed", "partially_completed", "completed"]);
      }
      // Await so Vercel keeps the function alive for long jobs
      await runGenerationJob(id);
      const { data: job } = await supabase
        .from("question_generation_jobs")
        .select("*")
        .eq("id", id)
        .single();
      return jsonOk({ job });
    }

    return jsonError("알 수 없는 요청입니다.");
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError(
      e instanceof Error ? e.message : "처리에 실패했습니다.",
      500
    );
  }
}
