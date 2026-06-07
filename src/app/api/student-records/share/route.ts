import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  buildStudentRecordShareUrl,
  generateShareToken,
  resolveShareBaseUrl,
  shareExpiresAt,
} from "@/lib/student-records/share-token";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface ShareBody {
  studentId?: string | null;
  studentName?: string;
  html?: string;
  generatedAt?: string;
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return NextResponse.json(
        { ok: false, message: "권한이 없습니다." },
        { status: 403 }
      );
    }

    if (profile.role === "teacher" && profile.is_active === false) {
      return NextResponse.json(
        { ok: false, message: "비활성화된 계정입니다." },
        { status: 403 }
      );
    }

    let body: ShareBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const studentName = body.studentName?.trim();
    const html = body.html?.trim();
    const generatedAt = body.generatedAt?.trim();

    if (!studentName || !html || !generatedAt) {
      return NextResponse.json(
        { ok: false, message: "studentName, html, generatedAt가 필요합니다." },
        { status: 400 }
      );
    }

    const token = generateShareToken();
    const expiresAt = shareExpiresAt(30);
    const baseUrl = resolveShareBaseUrl(request);

    const admin = createAdminClient();
    const { error } = await admin.from("shared_student_records").insert({
      token,
      student_id: body.studentId?.trim() || null,
      student_name: studentName,
      html,
      generated_at: generatedAt,
      created_by: profile.id,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("[student-records/share] insert failed:", error.message);
      return NextResponse.json(
        { ok: false, message: "공유 링크 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      shareUrl: buildStudentRecordShareUrl(token, baseUrl),
      token,
      expiresAt,
    });
  } catch (e) {
    console.error("[student-records/share] POST error:", e);
    return NextResponse.json(
      { ok: false, message: "공유 링크 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
