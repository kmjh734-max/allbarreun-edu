import {
  jsonError,
  jsonOk,
  requireStaffProfile,
} from "@/lib/question-generator/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const profile = await requireStaffProfile();
    const supabase = await createClient();
    let q = supabase
      .from("english_question_sets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (profile.role === "teacher") q = q.eq("created_by", profile.id);
    const { data, error } = await q;
    if (error) return jsonError(error.message, 500);
    return jsonOk({ sets: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("세트 조회 실패", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await requireStaffProfile();
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return jsonError("세트 제목을 입력해 주세요.");
    const items = Array.isArray(body.items) ? body.items : [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("english_question_sets")
      .insert({
        title,
        description: body.description?.trim() || null,
        items,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (error) return jsonError(error.message, 500);
    return jsonOk({ set: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("세트 저장 실패", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const profile = await requireStaffProfile();
    const body = await req.json();
    const id = body.id as string;
    if (!id) return jsonError("id가 필요합니다.");
    const supabase = await createClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.description === "string") {
      patch.description = body.description.trim();
    }
    if (Array.isArray(body.items)) patch.items = body.items;

    let q = supabase
      .from("english_question_sets")
      .update(patch)
      .eq("id", id);
    if (profile.role === "teacher") q = q.eq("created_by", profile.id);
    const { data, error } = await q.select("*").single();
    if (error) return jsonError(error.message, 500);
    return jsonOk({ set: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("세트 수정 실패", 500);
  }
}
