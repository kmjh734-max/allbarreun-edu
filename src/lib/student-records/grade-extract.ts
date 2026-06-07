import { extractChatMessageContent } from "@/lib/student-records/chat-content";
import {
  convertGrade5AverageToGrade9,
  GRADE_9_CONVERSION_DISCLAIMER,
} from "@/lib/student-records/grade-conversion";
import {
  isModelUnavailableError,
  isUnsupportedParameterError,
  isUnsupportedTemperatureError,
} from "@/lib/student-records/model";
import {
  buildOcrChatBody,
  getOcrModelCandidates,
} from "@/lib/student-records/ocr-chat";

type GradeRow = {
  semester: string;
  subject: string;
  credits: number;
  achievement?: string;
  rankGrade: number | null;
};

type GradeExtractJson = {
  rows?: GradeRow[];
};

type RequestProfile = {
  includeTemperature: boolean;
  includeSeed: boolean;
  includeJsonFormat: boolean;
};

const GRADE_EXTRACT_SYSTEM = `학교생활기록부 OCR 텍스트에서 교과 성적표만 JSON으로 추출합니다.
JSON만 출력하세요. 다른 설명 금지.

스키마:
{
  "rows": [
    {
      "semester": "1학년 1학기",
      "subject": "공통국어1",
      "credits": 3,
      "achievement": "A",
      "rankGrade": 3
    }
  ]
}

규칙:
- rankGrade: 석차등급 1~9 정수. 텍스트에 없으면 null (진로·예체능·비등급)
- credits: 이수학점 양수
- 텍스트에 없는 과목·숫자는 넣지 않음 (추측 금지)
- achievement: A/B/C 등, 없으면 생략`;

function defaultProfile(): RequestProfile {
  return {
    includeTemperature: true,
    includeSeed: true,
    includeJsonFormat: true,
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
  if (next.includeSeed && isUnsupportedParameterError(bodyText, "seed")) {
    next.includeSeed = false;
    changed = true;
  }
  if (
    next.includeJsonFormat &&
    isUnsupportedParameterError(bodyText, "response_format")
  ) {
    next.includeJsonFormat = false;
    changed = true;
  }

  return changed ? next : null;
}

function parseGradeRows(raw: string): GradeRow[] {
  try {
    const parsed = JSON.parse(raw) as GradeExtractJson;
    if (!Array.isArray(parsed.rows)) return [];

    return parsed.rows
      .map((row) => {
        const credits = Number(row.credits);
        const rank =
          row.rankGrade == null || row.rankGrade === undefined
            ? null
            : Number(row.rankGrade);
        const rankGrade =
          rank != null && Number.isFinite(rank) && rank >= 1 && rank <= 9
            ? Math.round(rank)
            : null;

        return {
          semester: String(row.semester ?? "").trim() || "미상",
          subject: String(row.subject ?? "").trim(),
          credits: Number.isFinite(credits) && credits > 0 ? credits : 0,
          achievement: row.achievement?.trim() || undefined,
          rankGrade,
        };
      })
      .filter((row) => row.subject && row.credits > 0);
  } catch {
    return [];
  }
}

function weightedRankAverage(rows: GradeRow[]): number | null {
  const graded = rows.filter((row) => row.rankGrade != null);
  if (graded.length === 0) return null;

  const totalCredits = graded.reduce((sum, row) => sum + row.credits, 0);
  if (totalCredits <= 0) return null;

  const totalPoints = graded.reduce(
    (sum, row) => sum + row.rankGrade! * row.credits,
    0
  );
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

function formatGradeBlock(rows: GradeRow[]): string | null {
  const graded = rows.filter((row) => row.rankGrade != null);
  if (graded.length < 2) return null;

  const overall = weightedRankAverage(rows);
  if (overall == null) return null;

  const conversion = convertGrade5AverageToGrade9(overall);

  const semesterKeys = [...new Set(rows.map((row) => row.semester))];
  const semesterLines = semesterKeys
    .map((semester) => {
      const subset = rows.filter((row) => row.semester === semester);
      const avg = weightedRankAverage(subset);
      if (avg == null) return null;
      return `- ${semester} 석차등급 가중평균: ${avg.toFixed(2)}`;
    })
    .filter(Boolean);

  const tableLines = graded.map((row) => {
    const ach = row.achievement ? `\t${row.achievement}` : "\t-";
    return `${row.semester}\t${row.subject}\t${row.credits}학점${ach}\t석차${row.rankGrade}등급\t(등급점수 ${row.rankGrade! * row.credits})`;
  });

  return [
    "=== 성적 산출 (코드 검증 — 보고서 섹션2에 그대로 사용, 재계산 금지) ===",
    "",
    "【과목별 계산표】",
    "학기\t과목\t학점\t성취도\t석차등급\t등급점수",
    ...tableLines,
    "",
    "【학기별 석차등급 가중평균】",
    ...semesterLines,
    "",
    `총 이수학점(석차등급 반영): ${graded.reduce((s, r) => s + r.credits, 0)}학점`,
    `전체 석차등급 가중평균(5등급제): ${overall.toFixed(2)}`,
    `9등급 환산 추정값: 약 ${conversion.grade9.toFixed(2)} (${conversion.level})`,
    GRADE_9_CONVERSION_DISCLAIMER,
  ].join("\n");
}

async function callGradeExtract(
  apiKey: string,
  ocrText: string,
  signal: AbortSignal
): Promise<GradeRow[] | null> {
  const models = getOcrModelCandidates();
  const userText = [
    "아래 OCR 텍스트에서 교과 성적표 rows만 JSON으로 추출하세요.",
    "",
    ocrText.slice(0, 120_000),
  ].join("\n");

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex]!;
    let profile = defaultProfile();

    for (let attempt = 0; attempt < 3; attempt++) {
      const body = buildOcrChatBody(model, GRADE_EXTRACT_SYSTEM, userText, {
        includeTemperature: profile.includeTemperature,
        includeSeed: profile.includeSeed,
        includeReasoningEffort: false,
        maxOutputTokens: 4096,
      });

      if (profile.includeJsonFormat) {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify(body),
      });

      const bodyText = await res.text();
      if (!res.ok) {
        if (
          modelIndex < models.length - 1 &&
          isModelUnavailableError(res.status, bodyText)
        ) {
          break;
        }
        const relaxed = relaxProfile(profile, bodyText);
        if (relaxed) {
          profile = relaxed;
          continue;
        }
        break;
      }

      const parsed = JSON.parse(bodyText) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const raw = extractChatMessageContent(
        parsed.choices?.[0]?.message?.content
      );
      const rows = parseGradeRows(raw);
      if (rows.length >= 2) return rows;
    }
  }

  return null;
}

/** OCR 텍스트에서 성적표를 구조화 추출 후 코드로 가중평균·환산 (입력마다 성적 수치 안정화) */
export async function buildVerifiedGradeBlock(
  apiKey: string,
  ocrText: string,
  signal: AbortSignal
): Promise<string | null> {
  if (!ocrText.trim()) return null;
  if (!/석차등급|석차\s*[1-9]|등급/.test(ocrText)) return null;

  const rows = await callGradeExtract(apiKey, ocrText, signal);
  if (!rows) return null;

  return formatGradeBlock(rows);
}
