import { extractChatMessageContent } from "@/lib/student-records/chat-content";
import {
  buildOcrChatBody,
  getOcrModelCandidates,
  PDF_OCR_MAX_OUTPUT_TOKENS,
  pdfDataUrlToBuffer,
  sanitizePdfFilename,
} from "@/lib/student-records/ocr-chat";
import {
  isGpt5FamilyModel,
  isUnsupportedParameterError,
  isUnsupportedTemperatureError,
} from "@/lib/student-records/model";
import { isReliableStudentRecordExtract } from "@/lib/student-records/ocr-quality";
import { convertPdfBufferToPageImages } from "@/lib/student-records/pdf-to-images";
import type { StudentRecordPdfDocument } from "@/lib/student-records/types";
import { extractTextFromPageImages } from "@/lib/student-records/vision-extract";

const PDF_OCR_SYSTEM = `당신은 학교생활기록부 OCR·전사 전문가입니다.
첨부 PDF의 모든 페이지를 빠짐없이 읽고 한국어로 전사합니다.

반드시 포함:
- 학생명, 학교명, 학년
- 성적표(학기, 과목, 학점, 성취도, 석차등급)
- 교과 세특, 창의적 체험활동, 봉사활동, 행동특성 및 종합의견

규칙:
- 보이는 내용만 적고 추측하지 않습니다.
- 판독 불가 항목은 [판독불가]로 표시합니다.
- 페이지 구분: === 페이지 N === 형식 사용
- 마크다운 없이 일반 텍스트만 출력합니다.`;

type FileContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "file"; file: { file_id: string } };

type RequestProfile = {
  includeTemperature: boolean;
  includeReasoningEffort: boolean;
};

function defaultProfile(model: string): RequestProfile {
  return {
    includeTemperature: !isGpt5FamilyModel(model),
    includeReasoningEffort: false,
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

async function callOcrChat(
  apiKey: string,
  model: string,
  content: FileContentPart[],
  signal: AbortSignal
): Promise<string | null> {
  let profile = defaultProfile(model);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify(
        buildOcrChatBody(model, PDF_OCR_SYSTEM, content, {
          ...profile,
          maxOutputTokens: PDF_OCR_MAX_OUTPUT_TOKENS,
        })
      ),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      const relaxed = relaxProfile(profile, bodyText);
      if (relaxed) {
        profile = relaxed;
        continue;
      }
      return null;
    }

    const parsed = JSON.parse(bodyText) as {
      choices?: { message?: { content?: unknown }; finish_reason?: string }[];
    };
    const raw = extractChatMessageContent(
      parsed.choices?.[0]?.message?.content
    );
    if (raw.length >= 200) return raw;
  }

  return null;
}

async function uploadPdfFile(
  apiKey: string,
  buffer: Buffer,
  filename: string,
  signal: AbortSignal
): Promise<string | null> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Uint8Array.from(buffer)], { type: "application/pdf" }),
    sanitizePdfFilename(filename)
  );
  form.append("purpose", "user_data");

  const res = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
    body: form,
  });

  if (!res.ok) return null;

  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}

async function deleteOpenAiFile(
  apiKey: string,
  fileId: string
): Promise<void> {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    // 정리 실패는 무시
  }
}

async function ocrViaUploadedFile(
  apiKey: string,
  buffer: Buffer,
  filename: string,
  studentName: string,
  signal: AbortSignal
): Promise<string | null> {
  const fileId = await uploadPdfFile(apiKey, buffer, filename, signal);
  if (!fileId) return null;

  try {
    const content: FileContentPart[] = [
      {
        type: "text",
        text: [
          `학생: ${studentName}`,
          `파일: ${filename}`,
          "첨부 PDF 전체 페이지를 빠짐없이 OCR 전사해 주세요.",
        ].join("\n"),
      },
      { type: "file", file: { file_id: fileId } },
    ];

    for (const model of getOcrModelCandidates()) {
      const text = await callOcrChat(apiKey, model, content, signal);
      if (text && text.length >= 300) return text;
    }
    return null;
  } finally {
    await deleteOpenAiFile(apiKey, fileId);
  }
}

async function ocrViaInlinePdf(
  apiKey: string,
  pdf: StudentRecordPdfDocument,
  studentName: string,
  signal: AbortSignal
): Promise<string | null> {
  const content: FileContentPart[] = [
    {
      type: "text",
      text: [
        `학생: ${studentName}`,
        `파일: ${pdf.name}`,
        "첨부 PDF 전체 페이지를 빠짐없이 OCR 전사해 주세요.",
      ].join("\n"),
    },
    {
      type: "file",
      file: {
        filename: sanitizePdfFilename(pdf.name),
        file_data: pdf.dataUrl,
      },
    },
  ];

  for (const model of getOcrModelCandidates()) {
    const text = await callOcrChat(apiKey, model, content, signal);
    if (text && text.length >= 300) return text;
  }

  return null;
}

async function ocrViaRenderedPages(
  apiKey: string,
  buffer: Buffer,
  filename: string,
  studentName: string,
  signal: AbortSignal
): Promise<string | null> {
  const { pageCount, images } = await convertPdfBufferToPageImages(buffer);
  if (images.length === 0) return null;

  const extracted = await extractTextFromPageImages(
    apiKey,
    images,
    studentName,
    signal
  );

  if (!extracted.trim()) return null;

  const failedOnly =
    extracted.includes("[이 구간 판독 실패]") &&
    !extracted.includes("=== 학생부 페이지") &&
    !extracted.includes("전사 ===");
  if (failedOnly) return null;

  return `=== PDF 페이지 OCR: ${filename} (${images.length}/${pageCount}페이지) ===\n${extracted}`;
}

async function ocrSinglePdf(
  apiKey: string,
  pdf: StudentRecordPdfDocument,
  studentName: string,
  signal: AbortSignal
): Promise<string | null> {
  const buffer = pdfDataUrlToBuffer(pdf.dataUrl);

  // 1) 고해상도 페이지 이미지 + Vision (스캔 PDF에 가장 정확)
  let text = await ocrViaRenderedPages(
    apiKey,
    buffer,
    pdf.name,
    studentName,
    signal
  );
  if (text && isReliableStudentRecordExtract(text)) return text;

  // 2) OpenAI Files API 업로드
  text = await ocrViaUploadedFile(
    apiKey,
    buffer,
    pdf.name,
    studentName,
    signal
  );
  if (text && isReliableStudentRecordExtract(text)) return text;

  // 3) 인라인 PDF (소용량·텍스트 PDF)
  text = await ocrViaInlinePdf(apiKey, pdf, studentName, signal);
  if (text && isReliableStudentRecordExtract(text)) return text;

  return text ?? null;
}

export async function extractTextFromPdfDocuments(
  apiKey: string,
  documents: StudentRecordPdfDocument[],
  studentName: string,
  signal: AbortSignal
): Promise<string> {
  const parts: string[] = [];

  for (const pdf of documents) {
    const text = await ocrSinglePdf(apiKey, pdf, studentName, signal);
    if (text) {
      parts.push(`=== PDF OCR: ${pdf.name} ===\n${text}`);
    } else {
      parts.push(`=== PDF OCR: ${pdf.name} ===\n[OCR 실패]`);
    }
  }

  return parts.join("\n\n");
}
