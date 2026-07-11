import {
  jsonError,
  jsonOk,
  requireStaffProfile,
} from "@/lib/question-generator/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireStaffProfile();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("question_generation_presets")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name");
    if (error) return jsonError(error.message, 500);
    return jsonOk({ presets: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("프리셋 조회 실패", 500);
  }
}

export async function POST(req: Request) {
  try {
    const profile = await requireStaffProfile();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("프리셋 이름을 입력해 주세요.");
    const config = body.config ?? { counts: {} };
    const supabase = await createClient();

    const isSystem = Boolean(body.isSystem) && profile.role === "admin";

    const { data, error } = await supabase
      .from("question_generation_presets")
      .insert({
        name,
        description: body.description?.trim() || null,
        config,
        is_system: isSystem,
        created_by: profile.id,
        slug: isSystem
          ? String(body.slug || name)
              .toLowerCase()
              .replace(/\s+/g, "_")
          : null,
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);
    return jsonOk({ preset: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("프리셋 저장 실패", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const profile = await requireStaffProfile();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("id가 필요합니다.");
    const supabase = await createClient();

    let q = supabase
      .from("question_generation_presets")
      .delete()
      .eq("id", id)
      .eq("is_system", false);

    if (profile.role === "teacher") q = q.eq("created_by", profile.id);

    const { error } = await q;
    if (error) return jsonError(error.message, 500);
    return jsonOk({});
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("프리셋 삭제 실패", 500);
  }
}
