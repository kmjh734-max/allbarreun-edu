import { extractHtmlFromModelOutput } from "@/lib/student-records/extract-html";
import { buildVerifiedGradeBlock } from "@/lib/student-records/grade-extract";
import { STUDENT_RECORD_ANALYSIS_TIMEOUT_MS } from "@/lib/student-records/limits";
import {
  buildStudentRecordChatBody,
  getStudentRecordModelCandidates,
  isGpt5FamilyModel,
  isModelUnavailableError,
  isUnsupportedParameterError,
  isUnsupportedTemperatureError,
} from "@/lib/student-records/model";
import { STUDENT_RECORD_ANALYSIS_SYSTEM_PROMPT } from "@/lib/student-records/system-prompt";

type RequestProfile = {
  includeTemperature: boolean;
  includeReasoningEffort: boolean;
};

function defaultProfile(model: string): RequestProfile {
  return {
    includeTemperature: !isGpt5FamilyModel(model),
    includeReasoningEffort: isGpt5FamilyModel(model),
  };
}

function relaxProfile(
  profile: RequestProfile,
  bodyText: string
): RequestProfile | null {
  const next = { ...profile };
  let changed = false;

  if (next.includeTemperature && isUnsupportedTemperatureError(bodyText)) {
    next.includeTemperature = false;
    changed = true;
  }
  if (
    next.includeReasoningEffort &&
    isUnsupportedParameterError(bodyText, "reasoning_effort")
  ) {
    next.includeReasoningEffort = false;
    changed = true;
  }

  return changed ? next : null;
}

export async function generateStudentRecordReport(
  studentName: string,
  text: string
): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, message: "OPENAI_API_KEY가 설정되어 있지 않습니다." };
  }

  if (!text.trim()) {
    return { ok: false, message: "분석할 학생부 내용이 없습니다." };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    STUDENT_RECORD_ANALYSIS_TIMEOUT_MS
  );

  let reportSourceText = text.trim();
  try {
    const gradeBlock = await buildVerifiedGradeBlock(
      apiKey,
      reportSourceText,
      controller.signal
    );
    if (gradeBlock) {
      reportSourceText = `${reportSourceText}\n\n${gradeBlock}`;
    }
  } catch {
    // 성적 블록 실패 시 OCR 원문만으로 보고서 생성
  }

  const nameHint =
    studentName === "학생"
      ? "학생명이 지정되지 않았습니다. 자료에서 학생명·학교명·학년을 추출해 Hero 섹션에 반영하세요."
      : `분석 대상 학생: ${studentName}`;

  const userText = [
    nameHint,
    "",
    "아래는 학교생활기록부 원문 자료입니다. 시스템 지침(추가 규칙 A~K 포함)을 모두 준수하여 HTML만 출력하세요.",
    "",
    "【생성 전 필수 확인 — 규칙 J】",
    "□ `=== 성적 산출 (코드 검증` 블록이 있으면 섹션2·Hero 성적 수치는 그 값을 그대로 사용 (재계산·수정 금지)",
    "□ 석차등급×이수학점 가중평균, 1·2·전체 학기 계산표",
    "□ 9등급 환산: 앵커 선형 보간, 단순 곱셈 금지, 「약」+ 면책 문구 + 골드 안내 박스",
    "□ 대학: K 0.08~0.17 세부구간·8항목(상향/적정/안정/전형추천)·주의학과 +0.2~0.4조정",
    "□ OCR 훼손·향후 명료화 권고 문구 절대 금지",
    "□ 자가진단: 1~8번 모두 LV 점수(가중 LV 평균) 산정, 요약표+산정근거표+LV분석표, 총점 게이지",
    "□ 성적(정량) vs 자가진단(정성) 분리, 교과전형 vs 학종 분리",
    "□ <!DOCTYPE html> ~ </html> HTML만 출력",
    "□ 섹션 6 HTML 디자인: Hero 그라데이션·카드·타임라인·2열·뱃지·게이지 등 프리미엄 UI 필수 (간소화 금지)",
    "□ 섹션 1~18 전체 포함 (축약 금지)",
    "",
    "=== 학생부 원문 ===",
    reportSourceText,
  ].join("\n");

  const models = getStudentRecordModelCandidates();
  let lastMessage = "학생부 분석 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";

  try {
    for (let i = 0; i < models.length; i++) {
      const model = models[i]!;
      let profile = defaultProfile(model);

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify(
            buildStudentRecordChatBody(
              model,
              STUDENT_RECORD_ANALYSIS_SYSTEM_PROMPT,
              userText,
              profile
            )
          ),
        });

        const bodyText = await res.text();
        if (!res.ok) {
          if (
            i < models.length - 1 &&
            isModelUnavailableError(res.status, bodyText)
          ) {
            break;
          }
          const relaxed = relaxProfile(profile, bodyText);
          if (relaxed) {
            profile = relaxed;
            continue;
          }
          lastMessage =
            "학생부 분석 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
          break;
        }

        const parsed = JSON.parse(bodyText) as {
          choices?: { message?: { content?: string }; finish_reason?: string }[];
        };
        const raw = parsed.choices?.[0]?.message?.content?.trim() ?? "";
        if (!raw) {
          const reason = parsed.choices?.[0]?.finish_reason ?? "unknown";
          lastMessage = `분석 결과가 비어 있습니다 (finish_reason=${reason}).`;
          break;
        }

        const html = extractHtmlFromModelOutput(raw);
        if (!html.includes("<")) {
          lastMessage = "HTML 보고서 형식으로 생성되지 않았습니다.";
          break;
        }

        return { ok: true, html };
      }
    }

    return { ok: false, message: lastMessage };
  } catch {
    return {
      ok: false,
      message:
        "보고서 생성 시간이 초과되었거나 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  } finally {
    clearTimeout(timer);
  }
}
