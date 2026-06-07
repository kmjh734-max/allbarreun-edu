import { createAdminClient } from "@/lib/supabase/admin";

export interface SharedStudentRecordPayload {
  studentName: string;
  html: string;
  generatedAt: string;
  expiresAt: string;
}

export type SharedStudentRecordLookup =
  | { status: "ok"; payload: SharedStudentRecordPayload }
  | { status: "expired" }
  | { status: "not_found" };

export async function lookupSharedStudentRecord(
  token: string
): Promise<SharedStudentRecordLookup> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shared_student_records")
      .select("student_name, html, generated_at, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) {
      return { status: "not_found" };
    }

    const expiresAt = data.expires_at as string;
    if (new Date(expiresAt).getTime() < Date.now()) {
      return { status: "expired" };
    }

    return {
      status: "ok",
      payload: {
        studentName: (data.student_name as string) ?? "학생",
        html: data.html as string,
        generatedAt: data.generated_at as string,
        expiresAt,
      },
    };
  } catch {
    return { status: "not_found" };
  }
}
