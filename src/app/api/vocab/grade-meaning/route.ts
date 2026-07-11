import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  fallbackMeaningFeedback,
  gradeMeaningFallback,
  gradeMeaningSingleWithAi,
  type MeaningGradeInput,
} from "@/lib/vocab/grade-meaning-ai";

function jsonError(message: string, status = 200) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "student") {
      return jsonError("학생 권한이 필요합니다.", 403);
    }

    const body = (await request.json()) as {
      word?: string;
      correctMeaning?: string;
      studentAnswer?: string;
    };

    const word = body.word?.trim() ?? "";
    const correctMeaning = body.correctMeaning?.trim() ?? "";
    const studentAnswer = body.studentAnswer ?? "";

    if (!word || !correctMeaning) {
      return jsonError("word와 correctMeaning이 필요합니다.");
    }

    const input: MeaningGradeInput = { word, correctMeaning, studentAnswer };

    const aiResult = await gradeMeaningSingleWithAi(input);

    if (aiResult.ok) {
      return NextResponse.json({
        ok: true,
        isCorrect: aiResult.isCorrect,
        feedback:
          aiResult.feedback ??
          (aiResult.isCorrect
            ? "의미상 정답으로 볼 수 있습니다."
            : "정답과 의미가 다릅니다."),
        gradedBy: "ai",
      });
    }

    const isCorrect = gradeMeaningFallback(correctMeaning, studentAnswer);
    return NextResponse.json({
      ok: true,
      isCorrect,
      feedback: fallbackMeaningFeedback(isCorrect),
      gradedBy: "fallback",
      message: aiResult.message,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "채점 중 오류가 발생했습니다.";
    return jsonError(message, 500);
  }
}
