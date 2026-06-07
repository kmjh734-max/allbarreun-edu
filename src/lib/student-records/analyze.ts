import { academyConfig } from "@/config/academy";
import { extractHtmlFromModelOutput } from "@/lib/student-records/extract-html";
import {
  STUDENT_RECORD_ANALYSIS_TIMEOUT_MS,
  STUDENT_RECORD_VISION_BATCH_THRESHOLD,
} from "@/lib/student-records/limits";
import {
  buildStudentRecordChatBody,
  getStudentRecordModelCandidates,
  isGpt5FamilyModel,
  isModelUnavailableError,
  isUnsupportedParameterError,
  isUnsupportedTemperatureError,
} from "@/lib/student-records/model";
import { STUDENT_RECORD_ANALYSIS_SYSTEM_PROMPT } from "@/lib/student-records/system-prompt";
import type { AnalyzeStudentRecordInput } from "@/lib/student-records/types";
import { extractTextFromPdfDocuments } from "@/lib/student-records/pdf-ocr";
import { extractTextFromPageImages } from "@/lib/student-records/vision-extract";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

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

async function generateHtmlReport(
  apiKey: string,
  studentName: string,
  text: string,
  imageDataUrls: string[],
  signal: AbortSignal
): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const nameHint =
    studentName === "학생"
      ? "학생명이 지정되지 않았습니다. 자료에서 학생명·학교명·학년을 추출해 Hero 섹션에 반영하세요."
      : `분석 대상 학생: ${studentName}`;

  const userText = [
    nameHint,
    "",
    "아래는 학교생활기록부 원문 자료입니다.",
    `${academyConfig.academyName} 생기부 자가진단표 8항목을 학생부 근거로 채점하고, 지침에 따라 HTML 보고서만 생성하세요.`,
    "",
    text.trim() || "(텍스트 없음 — 첨부 이미지를 판독하세요)",
  ].join("\n");

  const content: ContentPart[] = [{ type: "text", text: userText }];
  for (const url of imageDataUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const models = getStudentRecordModelCandidates();
  let lastMessage = "학생부 분석 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";

  for (let i = 0; i < models.length; i++) {
    const model = models[i]!;
    let profile = defaultProfile(model);
    let bodyText = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify(
          buildStudentRecordChatBody(
            model,
            STUDENT_RECORD_ANALYSIS_SYSTEM_PROMPT,
            content,
            profile
          )
        ),
      });

      bodyText = await res.text();

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
        lastMessage = `분석 결과가 비어 있습니다 (finish_reason=${reason}). 자료 분량을 줄여 다시 시도해 주세요.`;
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
}

export async function analyzeStudentRecord(
  input: AnalyzeStudentRecordInput
): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, message: "OPENAI_API_KEY가 설정되어 있지 않습니다." };
  }

  if (
    !input.text.trim() &&
    input.imageDataUrls.length === 0 &&
    input.pdfDocuments.length === 0
  ) {
    return {
      ok: false,
      message: "학생부 텍스트 또는 이미지/PDF 자료를 입력해 주세요.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    STUDENT_RECORD_ANALYSIS_TIMEOUT_MS
  );

  try {
    let reportText = input.text.trim();
    let reportImages = [...input.imageDataUrls];

    if (input.pdfDocuments.length > 0) {
      const ocrText = await extractTextFromPdfDocuments(
        apiKey,
        input.pdfDocuments,
        input.studentName,
        controller.signal
      );
      if (ocrText.trim()) {
        reportText = [reportText, ocrText].filter(Boolean).join("\n\n");
        const ocrSucceeded =
          ocrText.length > 300 && !ocrText.includes("[OCR 실패]");
        if (ocrSucceeded) {
          reportImages = [];
        }
      }
    }

    if (reportImages.length > STUDENT_RECORD_VISION_BATCH_THRESHOLD) {
      const extracted = await extractTextFromPageImages(
        apiKey,
        reportImages,
        input.studentName,
        controller.signal
      );

      reportText = [reportText, extracted].filter(Boolean).join("\n\n");
      reportImages = [];
    }

    return await generateHtmlReport(
      apiKey,
      input.studentName,
      reportText,
      reportImages,
      controller.signal
    );
  } catch {
    return {
      ok: false,
      message:
        "분석 시간이 초과되었거나 오류가 발생했습니다. 자료 분량을 줄여 다시 시도해 주세요.",
    };
  } finally {
    clearTimeout(timer);
  }
}
