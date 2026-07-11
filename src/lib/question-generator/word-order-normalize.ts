/** 제시어 배열 <보기> 정규화: 원형화 + 무작위 섞기 + 조건 정리 */

const FUNCTION_KEEP = new Set(
  [
    "a",
    "an",
    "the",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "from",
    "with",
    "by",
    "as",
    "if",
    "or",
    "and",
    "but",
    "not",
    "no",
    "so",
    "than",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "they",
    "them",
    "their",
    "he",
    "she",
    "him",
    "her",
    "we",
    "us",
    "our",
    "you",
    "your",
    "i",
    "me",
    "my",
    "who",
    "which",
    "what",
    "when",
    "where",
    "why",
    "how",
    "will",
    "would",
    "can",
    "could",
    "shall",
    "should",
    "may",
    "might",
    "must",
    "do",
    "does",
    "did",
    "be",
    "am",
    "is",
    "are",
    "was",
    "were",
    "been",
    "being",
    "have",
    "has",
    "had",
    "having",
  ].map((w) => w.toLowerCase())
);

/** 불규칙·자주 나오는 과거/과거분사 → 원형 */
const IRREGULAR: Record<string, string> = {
  been: "be",
  was: "be",
  were: "be",
  gone: "go",
  went: "go",
  known: "know",
  knew: "know",
  done: "do",
  did: "do",
  made: "make",
  taken: "take",
  took: "take",
  given: "give",
  gave: "give",
  seen: "see",
  saw: "see",
  came: "come",
  become: "become",
  became: "become",
  begun: "begin",
  began: "begin",
  broken: "break",
  broke: "break",
  brought: "bring",
  built: "build",
  bought: "buy",
  caught: "catch",
  chosen: "choose",
  chose: "choose",
  cut: "cut",
  drawn: "draw",
  drew: "draw",
  driven: "drive",
  drove: "drive",
  eaten: "eat",
  ate: "eat",
  fallen: "fall",
  fell: "fall",
  felt: "feel",
  found: "find",
  forgotten: "forget",
  forgot: "forget",
  gotten: "get",
  got: "get",
  grown: "grow",
  grew: "grow",
  heard: "hear",
  held: "hold",
  kept: "keep",
  left: "leave",
  lent: "lend",
  lost: "lose",
  meant: "mean",
  met: "meet",
  paid: "pay",
  put: "put",
  read: "read",
  ridden: "ride",
  rode: "ride",
  risen: "rise",
  rose: "rise",
  run: "run",
  ran: "run",
  said: "say",
  sold: "sell",
  sent: "send",
  set: "set",
  shown: "show",
  showed: "show",
  shut: "shut",
  sung: "sing",
  sang: "sing",
  sat: "sit",
  spoken: "speak",
  spoke: "speak",
  spent: "spend",
  stood: "stand",
  stolen: "steal",
  stole: "steal",
  stuck: "stick",
  swum: "swim",
  swam: "swim",
  taught: "teach",
  told: "tell",
  thought: "think",
  thrown: "throw",
  threw: "throw",
  understood: "understand",
  woken: "wake",
  woke: "wake",
  worn: "wear",
  wore: "wear",
  won: "win",
  written: "write",
  wrote: "write",
  allowed: "allow",
  allows: "allow",
  assumed: "assume",
  assumes: "assume",
  received: "receive",
  receives: "receive",
  reduced: "reduce",
  reduces: "reduce",
  tested: "test",
  tests: "test",
  provided: "provide",
  provides: "provide",
  required: "require",
  requires: "require",
  decided: "decide",
  decides: "decide",
  included: "include",
  includes: "include",
  created: "create",
  creates: "create",
};

const IRREGULAR_NOUN: Record<string, string> = {
  children: "child",
  men: "man",
  women: "woman",
  people: "person",
  teeth: "tooth",
  feet: "foot",
  mice: "mouse",
  geese: "goose",
  leaves: "leaf",
  lives: "life",
  knives: "knife",
  wives: "wife",
  selves: "self",
  monies: "money",
  moneys: "money",
  analyses: "analysis",
  crises: "crisis",
  theses: "thesis",
  phenomena: "phenomenon",
  criteria: "criterion",
  data: "datum",
};

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** -ing로 끝나지만 분사가 아닌 기본형·명사 */
const ING_KEEP = new Set([
  "meaning",
  "feeling",
  "building",
  "ceiling",
  "sibling",
  "morning",
  "evening",
  "something",
  "anything",
  "nothing",
  "everything",
  "wedding",
  "meeting",
  "hearing",
  "during",
  "according",
  "regarding",
  "including",
  "excluding",
  "following",
  "outstanding",
  "understanding",
  "beginning",
  "clothing",
  "housing",
  "offering",
  "training",
  "warning",
]);

/** 동사 과거·3인칭 / 명사 복수 → 기본형 (고신뢰만; e 임의 추가·삭제 금지) */
const S_KEEP = new Set(
  [
    "always",
    "news",
    "means",
    "series",
    "species",
    "physics",
    "mathematics",
    "economics",
    "politics",
    "basics",
    "thanks",
    "towards",
    "afterwards",
    "focus",
    "campus",
    "status",
    "bonus",
    "virus",
    "process",
    "access",
    "success",
    "progress",
    "address",
    "business",
    "perhaps",
    "otherwise",
    "ourselves",
    "themselves",
    "yourselves",
    "analysis",
    "basis",
    "crisis",
    "thesis",
    "across",
    "unless",
    "whereas",
    "besides",
  ].map((w) => w.toLowerCase())
);

export function lemmaEnglishToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  if (FUNCTION_KEEP.has(lower)) return lower;
  if (IRREGULAR[lower]) return IRREGULAR[lower];
  if (IRREGULAR_NOUN[lower]) return IRREGULAR_NOUN[lower];
  if (S_KEEP.has(lower)) return lower;

  // -ies → y (cities → city, studies → study)
  if (/^[a-z]+ies$/i.test(lower) && lower.length > 4) {
    return lower.slice(0, -3) + "y";
  }
  // -ves → f (wolves → wolf) — lives/leaves 등은 IRREGULAR_NOUN
  if (/^[a-z]+ves$/i.test(lower) && lower.length > 4) {
    return lower.slice(0, -3) + "f";
  }
  // -oes → o (heroes → hero, goes → go)
  if (/^[a-z]+oes$/i.test(lower) && lower.length > 4) {
    return lower.slice(0, -2);
  }
  // -sses / -ches / -shes / -xes / -zes → drop -es
  if (/(?:ss|ch|sh|x|z)es$/i.test(lower)) {
    return lower.slice(0, -2);
  }
  // buses / gases → bus / gas
  if (/[aeiou]ses$/i.test(lower) && lower.length > 4) {
    return lower.slice(0, -2);
  }
  // -ied → y (studied → study)
  if (/^[a-z]+ied$/i.test(lower) && lower.length > 4) {
    return lower.slice(0, -3) + "y";
  }
  // -ed: 고신뢰만 — 불규칙 맵 또는 자음 중복 (stopped → stop). e 임의 부착 금지.
  if (/^[a-z]+ed$/i.test(lower) && lower.length > 4) {
    const stem = lower.slice(0, -2);
    if (/(.)\1$/.test(stem) && stem.length >= 3) {
      return stem.slice(0, -1);
    }
    return lower;
  }
  // -ing: 명사 유지 · 자음 중복만 (running → run). making→make 등 추측 금지.
  if (/^[a-z]+ing$/i.test(lower) && lower.length > 5) {
    if (ING_KEEP.has(lower)) return lower;
    const stem = lower.slice(0, -3);
    if (/(.)\1$/.test(stem) && stem.length >= 2) {
      return stem.slice(0, -1);
    }
    return lower;
  }
  // 3인칭·복수 -s (allows → allow, consumers → consumer, changes → change)
  if (/^[a-z]+s$/i.test(lower) && lower.length > 4 && !/ss$/i.test(lower)) {
    if (/(?:ous|ius|us|is|ess|asis|esis|osis)$/i.test(lower)) return lower;
    // pages → page, changes → change
    if (/[bcdfghjklmnpqrstvwxyz]es$/i.test(lower)) {
      return lower.slice(0, -1);
    }
    if (/[^aeiou]s$/i.test(lower)) {
      return lower.slice(0, -1);
    }
  }

  return lower;
}

export function splitWordBank(raw: string): string[] {
  return raw
    .split(/\s*\/\s*|\s*,\s*|\n+/)
    .map((w) => w.trim())
    .filter((w) => w && /[A-Za-z]/.test(w) && !/[\uAC00-\uD7A3]/.test(w));
}

export function joinWordBank(words: string[]): string {
  return words.join(" / ");
}

export function normalizeAndShuffleWordBank(raw: string): string {
  const tokens = splitWordBank(scrubWordBankNoise(raw))
    .map(lemmaEnglishToken)
    .filter(Boolean);
  if (tokens.length === 0) return "";
  shuffleInPlace(tokens);
  return joinWordBank(tokens);
}

/** 표시용: 원형만 (재섞기 없음 — 매 렌더마다 순서가 바뀌지 않게) */
export function lemmaWordBankOnly(raw: string): string {
  const tokens = splitWordBank(scrubWordBankNoise(raw))
    .map(lemmaEnglishToken)
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return joinWordBank(tokens);
}

/** 보기에 섞인 «에 없는 단어 추가 가능»·한글 잔여 제거 */
const EXTRA_WORD_RE =
  /(?:<\/?보기>|\s*보기)?\s*에\s*없는\s*단어\s*추가\s*가능|없는\s*단어\s*추가\s*가능/gi;

export function scrubWordBankNoise(raw: string): string {
  return (raw || "")
    .replace(/<\/?보기>/gi, "")
    .replace(EXTRA_WORD_RE, " ")
    .replace(/^○\s*.+$/gm, " ")
    .replace(/[\uAC00-\uD7A3]+/g, " ")
    .replace(/\/\s*\//g, "/")
    .replace(/^\s*\/\s*|\s*\/\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function stripExtraWordHint(conditions: string): {
  conditions: string;
  allowExtraWords: boolean;
} {
  let allowExtraWords = EXTRA_WORD_RE.test(conditions);
  EXTRA_WORD_RE.lastIndex = 0;
  let next = conditions
    .replace(EXTRA_WORD_RE, "")
    .replace(/\s*\/\s*$/g, "")
    .replace(/^\s*\/\s*/g, "")
    .replace(/\n{2,}/g, "\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !/^○\s*$/.test(l) && !/^·\s*$/.test(l))
    .join("\n")
    .trim();
  // 한 줄에 여러 조건이 / 로 이어진 경우 줄바꿈
  if (!/\n/.test(next) && /\s\/\s/.test(next)) {
    next = next
      .split(/\s\/\s/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith("○") || s.startsWith("·") ? s : `○ ${s}`))
      .join("\n");
  }
  if (allowExtraWords || /추가\s*가능/.test(conditions)) {
    allowExtraWords = true;
  }
  return { conditions: next, allowExtraWords };
}

/** questionText의 <보기>·<조건>을 정리해 다시 조립 */
export function normalizeWordOrderQuestionText(questionText: string): string {
  const cleaned = (questionText || "")
    .replace(/<보기>(의|를|에|만|와|과|로|을|은|이|가)/g, "보기$1")
    .trim();
  if (!/<조건>/.test(cleaned) || !/<보기>/.test(cleaned) || !/<해석>/.test(cleaned)) {
    return questionText;
  }
  let conditions =
    cleaned.match(/<조건>\s*([\s\S]*?)(?=<보기>|$)/)?.[1]?.trim() ?? "";
  let words =
    cleaned.match(/<보기>\s*([\s\S]*?)(?=<해석>|$)/)?.[1]?.trim() ?? "";
  const translation =
    cleaned.match(/<해석>\s*([\s\S]*?)$/)?.[1]?.trim() ?? "";

  // 보기 본문에 섞인 안내·중복 태그·한글 잔여 제거
  words = scrubWordBankNoise(words)
    .replace(/가정법[\s\S]*?(?=\n|$)/g, "")
    .trim();
  // 조건에 문법 팁이 잘못 들어간 경우 조건만 남김 (긴 문법 설명은 제거하지 않되 보기 힌트는 분리)
  const stripped = stripExtraWordHint(conditions);
  conditions = stripped.conditions;
  if (stripped.allowExtraWords && !/어형|중복|추가|사용/.test(conditions)) {
    conditions = "○ 단어 중복·어형 변화 가능";
  } else if (stripped.allowExtraWords && !/추가/.test(conditions)) {
    /* keep */
  }

  words = normalizeAndShuffleWordBank(words);

  const condBlock = conditions
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

  return `<조건>\n${condBlock}\n\n<보기>\n${words}\n\n<해석>\n${translation}`.trim();
}
