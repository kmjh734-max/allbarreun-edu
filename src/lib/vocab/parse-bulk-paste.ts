export interface ParsedVocabRow {
  word: string;
  meaning: string;
  example_sentence: string;
  example_meaning: string;
}

const HEADER_PATTERNS = [
  /^단어\s*뜻/i,
  /^word\s*meaning/i,
  /^english\s*korean/i,
  /^단어\s*뜻\s*예문/i,
];

const HANGUL = /[\uAC00-\uD7A3]/;

function isHeaderLine(line: string): boolean {
  const normalized = line.trim().toLowerCase();
  return HEADER_PATTERNS.some((p) => p.test(normalized));
}

function rowFromColumns(cols: string[]): ParsedVocabRow | null {
  const word = cols[0]?.trim() ?? "";
  const meaning = cols[1]?.trim() ?? "";
  if (!word || !meaning) return null;

  return {
    word,
    meaning,
    example_sentence: cols[2]?.trim() ?? "",
    example_meaning: cols[3]?.trim() ?? "",
  };
}

/** 탭 구분(엑셀·시트 복사) */
function parseTabSeparatedLine(line: string): ParsedVocabRow | null {
  const cols = line.split("\t").map((c) => c.trim());
  return rowFromColumns(cols);
}

/**
 * 영어(또는 영어 숙어)와 한글 뜻 사이만 나눈다.
 * 한글 뜻 안의 콤마·여러 공백은 유지한다.
 */
function parseEnglishMeaningLine(line: string): ParsedVocabRow | null {
  const trimmed = line.trim();

  const commaIdx = trimmed.indexOf(",");
  if (commaIdx > 0) {
    const left = trimmed.slice(0, commaIdx).trim();
    const right = trimmed.slice(commaIdx + 1).trim();
    if (left && right && !HANGUL.test(left) && HANGUL.test(right)) {
      return rowFromColumns([left, right]);
    }
  }

  const hangulMatch = trimmed.match(/^(.+?)\s+([\uAC00-\uD7A3].*)$/);
  if (hangulMatch) {
    const word = hangulMatch[1].trim();
    const meaning = hangulMatch[2].trim();
    if (word && meaning) {
      return rowFromColumns([word, meaning]);
    }
  }

  const multiSpace = trimmed.match(/^(.+?)\s{2,}(.+)$/);
  if (multiSpace) {
    const word = multiSpace[1].trim();
    const meaning = multiSpace[2].trim();
    if (word && meaning && HANGUL.test(meaning)) {
      return rowFromColumns([word, meaning]);
    }
  }

  const spaced = trimmed.split(/\s+/);
  if (spaced.length >= 2) {
    const word = spaced[0]?.trim() ?? "";
    const meaning = spaced.slice(1).join(" ").trim();
    if (word && meaning && HANGUL.test(meaning)) {
      return rowFromColumns([word, meaning]);
    }
  }

  return null;
}

function parseLine(line: string): ParsedVocabRow | null {
  if (isHeaderLine(line)) return null;

  if (line.includes("\t")) {
    return parseTabSeparatedLine(line);
  }

  return parseEnglishMeaningLine(line);
}

export function parseBulkPaste(text: string): ParsedVocabRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ParsedVocabRow[] = [];

  for (const line of lines) {
    const row = parseLine(line);
    if (row) rows.push(row);
  }

  return rows;
}

export function mergeParsedRows(
  existing: { word: string }[],
  incoming: ParsedVocabRow[]
): {
  merged: ParsedVocabRow[];
  duplicates: string[];
} {
  const seen = new Set(
    existing.map((r) => r.word.trim().toLowerCase()).filter(Boolean)
  );
  const merged: ParsedVocabRow[] = [];
  const duplicates: string[] = [];

  for (const row of incoming) {
    const key = row.word.trim().toLowerCase();
    if (seen.has(key)) {
      duplicates.push(row.word);
      continue;
    }
    seen.add(key);
    merged.push(row);
  }

  return { merged, duplicates };
}
