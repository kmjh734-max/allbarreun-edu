import {
  jsonError,
  jsonOk,
  requireStaffProfile,
} from "@/lib/question-generator/api-helpers";
import type { GenerationRequestConfig } from "@/lib/question-generator/types";
import { createClient } from "@/lib/supabase/server";

/** 임시 저장: 지문 draft만 upsert */
export async function POST(req: Request) {
  try {
    const profile = await requireStaffProfile();
    const body = (await req.json()) as {
      passageId?: string | null;
      config: GenerationRequestConfig;
    };
    const config = body.config;
    if (!config) return jsonError("설정이 필요합니다.");

    const supabase = await createClient();
    const title = (config.title ?? "").trim() || "임시 저장";
    const row = {
      title,
      passage: config.passage ?? "",
      school_name: config.schoolName?.trim() || null,
      grade: config.grade || "고1",
      source_type: config.sourceType || "자체 지문",
      source_detail: config.sourceDetail?.trim() || null,
      overall_difficulty: config.overallDifficulty || "기본",
      draft_config: config,
      updated_at: new Date().toISOString(),
      created_by: profile.id,
    };

    if (body.passageId) {
      let q = supabase
        .from("english_source_passages")
        .update(row)
        .eq("id", body.passageId);
      if (profile.role === "teacher") q = q.eq("created_by", profile.id);
      const { data, error } = await q.select("id, updated_at").single();
      if (error) return jsonError(error.message, 500);
      return jsonOk({ passageId: data.id, savedAt: data.updated_at });
    }

    const { data, error } = await supabase
      .from("english_source_passages")
      .insert(row)
      .select("id, updated_at")
      .single();
    if (error) return jsonError(error.message, 500);
    return jsonOk({ passageId: data.id, savedAt: data.updated_at });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("임시 저장 실패", 500);
  }
}
