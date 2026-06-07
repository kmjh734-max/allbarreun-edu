const PLACEHOLDER_PATTERNS = [
  /^\[PDF:.*\] 스캔 PDF/m,
  /\[OCR 실패\]/,
  /\[이 구간 판독 실패\]/,
];

export function stripOcrPlaceholders(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\[PDF:.*\] 스캔 PDF/.test(line.trim()))
    .join("\n")
    .replace(/=== PDF OCR:.*?===\s*\[OCR 실패\]\s*/g, "")
    .trim();
}

export function hasSubstantiveStudentRecordText(text: string): boolean {
  let cleaned = stripOcrPlaceholders(text);
  for (const pattern of PLACEHOLDER_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  const compact = cleaned.replace(/\s+/g, "");
  return compact.length >= 400;
}

const RECORD_SIGNAL_PATTERN =
  /석차등급|성취도|원점수|과목|세특|창의적|행동특성|봉사|학기|학년|종합의견/g;

/** OCR 결과가 실제 학생부 내용으로 보이는지 (보고서 생성 전 2차 검증) */
export function isReliableStudentRecordExtract(text: string): boolean {
  if (!hasSubstantiveStudentRecordText(text)) return false;

  const body = stripOcrPlaceholders(text);
  const compact = body.replace(/\s+/g, "");
  if (compact.length < 500) return false;

  const signals = body.match(RECORD_SIGNAL_PATTERN)?.length ?? 0;
  if (signals < 1 && compact.length < 800) return false;

  const failed = (body.match(/\[이 구간 판독 실패\]|\[OCR 실패\]|\[판독불가\]/g) ?? [])
    .length;
  const success =
    (body.match(/=== 학생부 페이지 \d+ 전사 ===|=== 페이지 \d+ ===/g) ?? [])
      .length;

  if (failed > 0 && success === 0) return false;
  if (success > 0 && failed > success) return false;

  return true;
}

/** 페이지 1장 OCR 품질 점수 (모델 후보 중 최고 결과 선택용) */
export function scorePageOcrText(text: string): number {
  const body = text.trim();
  if (!body || body.includes("[이 구간 판독 실패]")) return 0;

  const compact = body.replace(/\s+/g, "");
  if (compact.length < 40) return 0;

  let score = Math.min(compact.length, 4000);
  score += (body.match(/[가-힣·]{2,}\d?/g) ?? []).length * 12;
  score += (body.match(/석차|[1-9]\s*등급|성취도|학점|세특|교과/g) ?? []).length * 20;
  score -= (body.match(/\[판독불가\]/g) ?? []).length * 25;
  return score;
}

export function isAcceptablePageOcr(text: string): boolean {
  return scorePageOcrText(text) >= 100;
}
