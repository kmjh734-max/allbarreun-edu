import { getCurrentProfile } from "@/lib/auth/get-profile";
import type { Profile } from "@/types/database";

export async function requireStaffProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
    throw new Response(JSON.stringify({ ok: false, message: "권한이 없습니다." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (profile.role === "teacher" && profile.is_active === false) {
    throw new Response(
      JSON.stringify({ ok: false, message: "비활성 계정입니다." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return profile;
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}
