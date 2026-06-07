export type ParsedGradeRow = {
  semester: string;
  subject: string;
  credits: number;
  achievement?: string;
  rankGrade: number | null;
};

/** OCR 텍스트에서 석차등급이 붙은 과목 행 대략 개수 (누락 검증용) */
export function estimateGradeRowCountInText(text: string): number {
  const lines = text.split("\n");
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 4) continue;
    if (/^(과목|교과|학점|성취도|석차|학기|학년|구분)/.test(trimmed)) continue;
    if (/^\[/.test(trimmed)) continue;
    if (parseGradeLine(trimmed)) count += 1;
  }

  return count;
}

export function normalizeSemesterLabel(raw: string): string {
  const m = raw.match(/(\d)\s*학년\s*(\d)\s*학기/);
  if (m) return `${m[1]}학년 ${m[2]}학기`;
  const dash = raw.match(/(\d)\s*[-–]\s*(\d)/);
  if (dash) return `${dash[1]}학년 ${dash[2]}학기`;
  return raw.trim() || "미상";
}

export function normalizeSubjectName(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .replace(/[·・]/g, "·")
    .trim();
}

function rowKey(semester: string, subject: string): string {
  return `${normalizeSemesterLabel(semester)}|${normalizeSubjectName(subject)}`;
}

function parseIntSafe(value: string | undefined): number | null {
  if (value == null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** 한 줄에서 교과 성적 행 파싱 (실패 시 null) */
function parseGradeLine(line: string): ParsedGradeRow | null {
  const trimmed = line.trim();
  if (trimmed.length < 3) return null;

  // 헤더·섹션 제목
  if (
    /^(과목|교과|학점|성취도|석차|원점수|비고|학기|학년|구분|영역)/.test(
      trimmed
    )
  ) {
    return null;
  }
  if (/^===|^【|^\[/.test(trimmed)) return null;
  if (/세특|창의적|봉사|행동특성|종합의견|특기|활동/.test(trimmed)) {
    return null;
  }

  const patterns: RegExp[] = [
    // 공통국어1  3학점  A  석차3등급
    /^([가-힣·／/\s]+?\d*)\s+(\d)\s*학점?\s*([ABC])\s*(?:성취도)?\s*(?:석차)?\s*([1-9])\s*등급?/i,
    // 공통국어1  3  A  3등급
    /^([가-힣·／/\s]+?\d*)\s+(\d)\s+([ABC])\s+(?:석차)?\s*([1-9])\s*등급?/i,
    // 공통국어1  3  A  3  (등급 생략)
    /^([가-힣·／/\s]+?\d*)\s+(\d)\s+([ABC])\s+([1-9])\s*$/,
    // 공통국어1\t3\tA\t3
    /^([가-힣·／/\s]+?\d*)\s*[\t|]\s*(\d)\s*[\t|]\s*([ABC])?\s*[\t|]?\s*(?:석차)?\s*([1-9])\s*등급?/i,
    // 공통국어1 3 B 2 (성취도+석차만)
    /^([가-힣·／/\s]+?\d*)\s+(\d)\s+([ABC])\s+([1-9])\s*$/,
    // 기술·가정 3 C 3
    /^([가-힣·]+)\s+(\d)\s+([ABC])\s+(?:석차)?\s*([1-9])\s*등급?/i,
  ];

  for (const pattern of patterns) {
    const m = trimmed.match(pattern);
    if (!m) continue;

    const subject = normalizeSubjectName(m[1]!);
    if (subject.length < 2) continue;
    if (/^\d+$/.test(subject)) continue;

    const credits = parseIntSafe(m[2]);
    if (credits == null || credits < 1 || credits > 5) continue;

    const third = m[3]?.trim();
    const fourth = m[4]?.trim();

    let achievement: string | undefined;
    let rankGrade: number | null;

    if (third && /^[ABC]$/i.test(third)) {
      achievement = third.toUpperCase();
      rankGrade = parseIntSafe(fourth);
    } else {
      rankGrade = parseIntSafe(third);
    }

    if (rankGrade == null || rankGrade < 1 || rankGrade > 9) continue;

    return {
      semester: "미상",
      subject,
      credits,
      achievement,
      rankGrade,
    };
  }

  return null;
}

/** OCR 전사 텍스트에서 정규식으로 교과 성적 행 추출 (LLM 누락 보완) */
export function parseGradesFromOcrText(text: string): ParsedGradeRow[] {
  let currentSemester = "미상";
  const rows: ParsedGradeRow[] = [];
  const seen = new Set<string>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const semInline = trimmed.match(/(\d)\s*학년\s*(\d)\s*학기/);
    if (semInline) {
      currentSemester = `${semInline[1]}학년 ${semInline[2]}학기`;
    }

    if (/^(\d)\s*학년\s*(\d)\s*학기/.test(trimmed) && trimmed.length < 20) {
      continue;
    }

    const parsed = parseGradeLine(trimmed);
    if (!parsed) continue;

    parsed.semester = currentSemester;
    const key = rowKey(parsed.semester, parsed.subject);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed);
  }

  return rows;
}

export function mergeGradeRows(
  primary: ParsedGradeRow[],
  secondary: ParsedGradeRow[]
): ParsedGradeRow[] {
  const map = new Map<string, ParsedGradeRow>();

  for (const row of primary) {
    map.set(rowKey(row.semester, row.subject), row);
  }

  for (const row of secondary) {
    const key = rowKey(row.semester, row.subject);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }

    map.set(key, {
      semester:
        existing.semester !== "미상" ? existing.semester : row.semester,
      subject: existing.subject || row.subject,
      credits: existing.credits || row.credits,
      achievement: existing.achievement ?? row.achievement,
      rankGrade: existing.rankGrade ?? row.rankGrade,
    });
  }

  return [...map.values()].sort((a, b) => {
    const sem = a.semester.localeCompare(b.semester, "ko");
    if (sem !== 0) return sem;
    return a.subject.localeCompare(b.subject, "ko");
  });
}
