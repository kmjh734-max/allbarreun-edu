import {
  lemmaWordBankOnly,
  stripExtraWordHint,
} from "@/lib/question-generator/word-order-normalize";

/** 문장 중간의 <보기>의 → 보기의 (섹션 태그와 혼동 방지) */
export function sanitizeInlineSectionMentions(text: string): string {
  return (text || "")
    .replace(/<보기>(의|를|에|만|와|과|로|을|은|이|가)/g, "보기$1")
    .replace(/<조건>(의|를|에|만|와|과|로|을|은|이|가)/g, "조건$1")
    .replace(/<해석>(의|를|에)/g, "해석$1")
    .replace(/<요약문>(의|를|에)/g, "요약문$1");
}

/** 줄 단독 섹션 태그만 구분자로 인정 */
function sectionOpen(tag: string): RegExp {
  return new RegExp(`(?:^|\\n)\\s*<${tag}>\\s*(?=\\n|$)`);
}

function sliceAfterTag(text: string, tag: string): string | null {
  const re = new RegExp(`(?:^|\\n)\\s*<${tag}>\\s*\\n?`);
  const m = re.exec(text);
  if (!m || m.index == null) return null;
  return text.slice(m.index + m[0].length);
}

function sliceUntilNextSection(text: string, stopTags: string[]): string {
  let cut = text.length;
  for (const tag of stopTags) {
    const m2 = new RegExp(`(?:^|\\n)\\s*<${tag}>\\s*(?=\\n|$)`).exec(text);
    if (m2 && m2.index != null && m2.index < cut) cut = m2.index;
  }
  return text.slice(0, cut).trim();
}

/** 메타 태그·군더더기 발문 제거 */
export function cleanQuestionText(text: string): string {
  return (text || "")
    .replace(/\[[^\]]*변형[^\]]*\]/g, "")
    .replace(/\[[0-9]{6}H[0-9][^\]]*\]/g, "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^\[[^\]]+\]$/.test(l)) return false;
      if (/다음 글을 읽고\s*물음에\s*답하시오\.?/.test(l)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

/** 지문 비교용 정규화 */
export function normalizePassage(text: string): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

/** 영어 지문 문장 수 추정 (.?! 기준) */
export function countEnglishSentences(text: string): number {
  const cleaned = normalizePassage(text);
  if (!cleaned) return 0;
  const parts = cleaned
    .split(/(?<=[.!?])(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => {
      const letters = (s.match(/[A-Za-z]/g) ?? []).length;
      return letters >= 3;
    });
  return parts.length;
}

/** 제시어 배열 questionText의 <조건>/<보기>/<해석> 블록 파싱 */
export function parseWordOrderBlocks(text: string): {
  conditions: string;
  words: string;
  translation: string;
  allowExtraWords: boolean;
} | null {
  const cleaned = sanitizeInlineSectionMentions(
    cleanQuestionText(text)
  ).trim();
  if (
    !/<조건>/.test(cleaned) ||
    !sectionOpen("보기").test(cleaned) ||
    !/<해석>/.test(cleaned)
  ) {
    // fallback: still require tags somewhere
    if (!/<조건>/.test(cleaned) || !/<보기>/.test(cleaned) || !/<해석>/.test(cleaned)) {
      return null;
    }
  }

  const afterCond = sliceAfterTag(cleaned, "조건");
  const afterBogi = sliceAfterTag(cleaned, "보기");
  const afterInterp = sliceAfterTag(cleaned, "해석");
  if (afterCond == null || afterBogi == null || afterInterp == null) {
    return null;
  }

  let conditions = sliceUntilNextSection(afterCond, ["보기", "해석", "요약문"]);
  let words = sliceUntilNextSection(afterBogi, ["해석", "요약문", "조건"]);
  const translation = sliceUntilNextSection(afterInterp, [
    "조건",
    "보기",
    "요약문",
  ]);

  if (!conditions && !words && !translation) return null;

  // 조건에 남은 깨진 문구 복구
  conditions = conditions
    .replace(/^의\s+단어를/m, "보기의 단어를")
    .replace(/○\s*의\s+단어를/g, "○ 보기의 단어를");

  words = words
    .replace(/<\/?보기>/gi, "")
    .replace(/(?:보기)?\s*에\s*없는\s*단어\s*추가\s*가능/gi, "")
    .replace(/없는\s*단어\s*추가\s*가능/gi, "")
    // 조건 줄이 보기에 섞인 경우 제거
    .replace(/^○\s*.+$/gm, "")
    .replace(/보기의\s*단어를[\s\S]*?(?=[a-zA-Z]|$)/g, "")
    .trim();

  const stripped = stripExtraWordHint(conditions);
  conditions = stripped.conditions;
  const allowExtraWords =
    stripped.allowExtraWords ||
    /없는\s*단어\s*추가|추가\s*가능/.test(cleaned);

  words = lemmaWordBankOnly(words);

  return { conditions, words, translation, allowExtraWords };
}

/** 요약문 서술형 questionText: <조건> / (선택)<보기> / <요약문> */
export function parseSummaryWritingBlocks(text: string): {
  conditions: string;
  words: string | null;
  summary: string;
  blankLabels: string[];
} | null {
  const cleaned = sanitizeInlineSectionMentions(
    cleanQuestionText(text)
  ).trim();
  if (!/<조건>/.test(cleaned) || !/<요약문>/.test(cleaned)) {
    return null;
  }

  const afterCond = sliceAfterTag(cleaned, "조건");
  const afterSummary = sliceAfterTag(cleaned, "요약문");
  if (afterCond == null || afterSummary == null) return null;

  const hasBogiSection = sectionOpen("보기").test(cleaned);
  let conditions = sliceUntilNextSection(
    afterCond,
    hasBogiSection ? ["보기", "요약문"] : ["요약문", "보기"]
  );
  let words: string | null = null;
  if (hasBogiSection) {
    const afterBogi = sliceAfterTag(cleaned, "보기");
    if (afterBogi != null) {
      words = sliceUntilNextSection(afterBogi, ["요약문", "조건", "해석"]);
    }
  }
  const summary = sliceUntilNextSection(afterSummary, [
    "조건",
    "보기",
    "해석",
  ]);
  if (!summary) return null;

  conditions = conditions
    .replace(/^의\s+단어를/m, "보기의 단어를")
    .replace(/○\s*의\s+단어를/g, "○ 보기의 단어를")
    .replace(/N\+M\s*=\s*<보기>\s*단어/gi, "N+M = 보기 단어");

  if (words != null) {
    words = words
      .replace(/<\/?보기>/gi, "")
      .replace(/^○\s*.+$/gm, "")
      .replace(/보기의\s*단어를[\s\S]*?(?=[a-zA-Z]|$)/g, "")
      .trim();
    words = lemmaWordBankOnly(words);
  }

  const blankLabels = Array.from(
    new Set(summary.match(/[ⓐⓑⓒⓓⓔ]/g) ?? [])
  ).sort();
  return { conditions, words, summary, blankLabels };
}

/** 본문에 연속 N단어로 존재하는지 (대소문자·구두점 무시) */
export function passageHasConsecutiveWords(
  passage: string,
  phrase: string,
  expectedWordCount?: number
): boolean {
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const p = norm(passage);
  const ph = norm(phrase);
  if (!p || !ph) return false;
  const words = ph.split(" ").filter(Boolean);
  if (expectedWordCount != null && words.length !== expectedWordCount) {
    return false;
  }
  return ` ${p} `.includes(` ${ph} `);
}

/** 지칭 서술형 답란 마커 */
export function parseReferenceAnswerBlock(text: string): {
  labels: string[];
} | null {
  const cleaned = cleanQuestionText(text).trim();
  if (!/<지칭답란>/.test(cleaned)) return null;
  const body =
    cleaned.match(/<지칭답란>\s*([\s\S]*?)$/)?.[1]?.trim() ?? "";
  const labels = (body.match(/[ⓐⓑⓒⓓⓔ]/g) ?? []).filter(Boolean);
  return { labels: labels.length ? labels : ["ⓐ"] };
}

/** 어법 오류 수정 서술형: <조건> + <답안행> */
export function parseGrammarCorrectionBlocks(text: string): {
  conditions: string;
  rowCount: number;
} | null {
  const cleaned = cleanQuestionText(text).trim();
  if (!/<조건>/.test(cleaned) || !/<답안행>/.test(cleaned)) return null;
  if (/<보기>|<해석>|<요약문>/.test(cleaned)) return null;
  const conditions =
    cleaned.match(/<조건>\s*([\s\S]*?)(?=<답안행>|$)/)?.[1]?.trim() ?? "";
  const rowRaw =
    cleaned.match(/<답안행>\s*(\d+)/)?.[1] ??
    cleaned.match(/<답안행>\s*([\s\S]*?)$/)?.[1]?.trim() ??
    "";
  const rowCount = Math.max(1, Math.min(5, parseInt(String(rowRaw), 10) || 2));
  return { conditions, rowCount };
}

/** 단어 수 (영어 공백 기준) */
export function countEnglishWords(text: string): number {
  return (text || "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * 복사·붙여넣기 시 생긴 어색한 줄바꿈을 풀어 A4 폭에 맞게 자연스럽게 흐르게 함.
 * 빈 줄(문단)만 유지하고, 한 줄 개행은 공백으로 합침.
 */
export function reflowPassageForPrint(text: string): string[] {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n+/)
    .map((para) =>
      para
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}
