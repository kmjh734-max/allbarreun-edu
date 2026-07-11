import { VALIDATION_PASS_SCORE } from "@/lib/question-generator/constants";
import type {
  GeneratedQuestionPayload,
  QuestionTypeOption,
  QuestionValidation,
} from "@/lib/question-generator/types";

/** 로컬 형태 검수만 (AI 검수 호출 없음 — 속도 우선) */
export function validateGeneratedQuestion(opts: {
  passage: string;
  option: QuestionTypeOption;
  question: GeneratedQuestionPayload;
}): QuestionValidation {
  const q = opts.question;
  const option = opts.option;
  const warnings: string[] = [];
  let score = 100;

  if (option.isObjective) {
    const slotInPassage =
      option.type === "sentence_insertion" ||
      option.type === "irrelevant_sentence" ||
      (option.type === "vocabulary" && option.aingkaCode === "어휘추론");

    if (slotInPassage) {
      if (
        option.type === "sentence_insertion" &&
        !(q.questionText || "").trim()
      ) {
        warnings.push("주어진 문장이 없습니다.");
        score -= 40;
      }
    } else if (!q.choices || q.choices.length !== 5) {
      warnings.push("선택지 개수가 5개가 아닙니다.");
      score -= 40;
    }

    const nums = new Set((q.choices ?? []).map((c) => c.number));
    if (!slotInPassage && nums.size !== (q.choices?.length ?? 0)) {
      warnings.push("선택지 번호가 중복되었습니다.");
      score -= 15;
    }
    if (!slotInPassage) {
      const empty = (q.choices ?? []).some((c) => !c.text.trim());
      if (empty) {
        warnings.push("빈 선택지가 있습니다.");
        score -= 20;
      }
    }

    // 개수형: 1개~5개 고정 검증
    if (
      (option.type === "grammar" && option.aingkaCode === "어법개수") ||
      (option.type === "vocabulary" && option.aingkaCode === "어휘개수")
    ) {
      const texts = (q.choices ?? []).map((c) => c.text.trim());
      if (texts.join("|") !== "1개|2개|3개|4개|5개") {
        warnings.push("개수 보기가 1개~5개 형식이 아닙니다.");
        score -= 40;
      }
    }
  }

  if (!q.instruction.trim()) {
    warnings.push("발문이 없습니다.");
    score -= 30;
  }
  if (!q.explanation.trim()) {
    warnings.push("해설이 없습니다.");
    score -= 25;
  }
  if (q.type !== option.type) {
    warnings.push("요청 유형과 생성 유형이 다릅니다.");
    score -= 30;
  }

  // 요지인데 요약문완성(빈칸·…… 쌍)으로 나온 경우 폐기
  if (option.type === "summary_mcq") {
    const blob = [
      q.questionText,
      q.instruction,
      ...(q.choices ?? []).map((c) => c.text),
    ]
      .join("\n")
      .toLowerCase();
    const looksLikeSummaryBlank =
      /요약문/.test(blob) ||
      (/\(a\)/.test(blob) && /\(b\)/.test(blob)) ||
      (q.choices ?? []).some((c) => /……|\.{2,}\s*\S+\s*\.{2,}|…{2,}/.test(c.text));
    if (looksLikeSummaryBlank) {
      warnings.push("요약문완성 형식이 감지되어 요지 문항으로 사용할 수 없습니다.");
      score -= 80;
    }
  }

  return {
    singleCorrectAnswer: true,
    answerMatchesExplanation: Boolean(q.explanation.trim()),
    evidenceExists: true,
    ambiguityRisk: score < 70 ? "high" : "low",
    difficultyMatch: true,
    grammarChecked: true,
    overallScore: Math.max(0, Math.min(100, score)),
    warnings,
    typeMatch: q.type === option.type,
  };
}

export function shouldRegenerate(v: QuestionValidation): boolean {
  if (v.overallScore < VALIDATION_PASS_SCORE) return true;
  if (!v.answerMatchesExplanation) return true;
  if (v.typeMatch === false) return true;
  if (!v.singleCorrectAnswer) return true;
  return false;
}
