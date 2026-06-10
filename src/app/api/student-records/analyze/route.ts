import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { extractStudentRecordContent } from "@/lib/student-records/extract-content";
import { generateStudentRecordReport } from "@/lib/student-records/generate-report";
import { parseStudentRecordUpload } from "@/lib/student-records/parse-upload";
import { resolveStudentRecordTarget } from "@/lib/student-records/resolve-student";

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

    const formData = await request.formData();
    const studentId = String(formData.get("studentId") ?? "").trim();
    const manualName = String(formData.get("studentName") ?? "").trim();

    const target = await resolveStudentRecordTarget({
      role: profile.role,
      profileId: profile.id,
      studentId,
      manualName,
    });
    if (!target.ok) {
      return jsonError(target.message, target.status);
    }

    let parsed;
    try {
      parsed = await parseStudentRecordUpload(formData);
    } catch (e) {
      return jsonError(
        e instanceof Error ? e.message : "파일을 처리하지 못했습니다."
      );
    }

    const combinedText = parsed.textParts.join("\n\n");
    const hasMaterial =
      combinedText.trim().length > 0 ||
      parsed.imageDataUrls.length > 0 ||
      parsed.pdfDocuments.length > 0;

    if (!hasMaterial) {
      return jsonError(
        "학생부 텍스트를 붙여넣거나, PDF/이미지 파일을 업로드해 주세요."
      );
    }

    const extracted = await extractStudentRecordContent({
      studentId: target.studentId,
      studentName: target.studentName,
      text: combinedText,
      imageDataUrls: parsed.imageDataUrls,
      pdfDocuments: parsed.pdfDocuments,
    });

    if (!extracted.ok) {
      return jsonError(extracted.message);
    }

    const analysisInstructions = String(
      formData.get("analysisInstructions") ?? ""
    ).trim();

    const generated = await generateStudentRecordReport(
      target.studentName,
      extracted.text,
      { analysisInstructions }
    );

    if (!generated.ok) {
      return jsonError(generated.message);
    }

    return NextResponse.json({
      ok: true,
      html: generated.html,
      studentId: target.studentId,
      studentName: target.studentName,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "분석 오류";
    if (message.toLowerCase().includes("entity too large")) {
      return jsonError(
        "업로드 용량이 서버 한도를 초과했습니다. PDF·이미지 용량을 줄여 주세요.",
        413
      );
    }
    return jsonError(message, 500);
  }
}
