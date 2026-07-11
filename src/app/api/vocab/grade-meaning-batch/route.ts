import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  fallbackMeaningFeedback,
  gradeMeaningFallback,
  gradeMeaningWithAi,
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
      items?: MeaningGradeInput[];
    };

    const items = (body.items ?? []).filter(
      (i) => i.word?.trim() && i.correctMeaning?.trim()
    );

    if (items.length === 0) {
      return jsonError("채점할 답이 없습니다.");
    }

    const aiResult = await gradeMeaningWithAi(items);

    if (aiResult.ok) {
      return NextResponse.json({
        ok: true,
        results: aiResult.results.map((r) => ({
          isCorrect: r.isCorrect,
          feedback:
            r.feedback ??
            (r.isCorrect
              ? "의미상 정답으로 볼 수 있습니다."
              : "정답과 의미가 다릅니다."),
        })),
        gradedBy: "ai",
      });
    }

    const results = items.map((item) => {
      const isCorrect = gradeMeaningFallback(
        item.correctMeaning,
        item.studentAnswer
      );
      return {
        isCorrect,
        feedback: fallbackMeaningFeedback(isCorrect),
      };
    });

    return NextResponse.json({
      ok: true,
      results,
      gradedBy: "fallback",
      message: aiResult.message,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "채점 중 오류가 발생했습니다.";
    return jsonError(message, 500);
  }
}
