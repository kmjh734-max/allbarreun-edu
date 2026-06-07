import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { generateStudentRecordReport } from "@/lib/student-records/generate-report";

export const runtime = "nodejs";
export const maxDuration = 300;

function jsonError(message: string, status = 200) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return jsonError("권한이 없습니다.", 403);
    }

    const body = (await request.json()) as {
      studentName?: string;
      text?: string;
    };

    const studentName = String(body.studentName ?? "").trim() || "학생";
    const text = String(body.text ?? "").trim();

    if (!text) {
      return jsonError("분석할 학생부 내용이 없습니다.");
    }

    const result = await generateStudentRecordReport(studentName, text);
    if (!result.ok) {
      return jsonError(result.message);
    }

    return NextResponse.json({
      ok: true,
      html: result.html,
      studentName,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "보고서 생성 오류";
    return jsonError(message, 500);
  }
}
