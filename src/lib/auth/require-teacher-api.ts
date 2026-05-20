import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireTeacherApi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "teacher") {
    return {
      error: NextResponse.json(
        { ok: false, message: "강사 권한이 필요합니다." },
        { status: 403 }
      ),
    };
  }

  if (profile.is_active === false) {
    return {
      error: NextResponse.json(
        { ok: false, message: "비활성화된 계정입니다." },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, profile };
}
