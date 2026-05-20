import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export function adminJsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function checkSupabaseAdminEnv():
  | { error: NextResponse }
  | Record<string, never> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      error: adminJsonError(
        "NEXT_PUBLIC_SUPABASE_URL이 서버에 설정되지 않았습니다.",
        500
      ),
    };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: adminJsonError(
        "SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되지 않았습니다. .env.local을 확인한 뒤 개발 서버를 재시작해 주세요.",
        500
      ),
    };
  }
  return {};
}

export type AdminClientResult =
  | { ok: true; admin: SupabaseClient }
  | { ok: false; response: NextResponse };

export function getAdminClientSafe(): AdminClientResult {
  const envCheck = checkSupabaseAdminEnv();
  if ("error" in envCheck && envCheck.error) {
    return { ok: false, response: envCheck.error };
  }
  try {
    return { ok: true, admin: createAdminClient() };
  } catch (initError) {
    const msg =
      initError instanceof Error
        ? initError.message
        : "Supabase 관리자 클라이언트를 초기화할 수 없습니다.";
    return { ok: false, response: adminJsonError(msg, 500) };
  }
}
