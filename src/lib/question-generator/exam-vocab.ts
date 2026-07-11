import { createAdminClient } from "@/lib/supabase/admin";
import { persistVocabItems } from "@/lib/vocab/save-items";
import { SITE_URL } from "@/lib/branding";
import { lemmaEnglishToken } from "@/lib/question-generator/word-order-normalize";

export type HardWord = { word: string; meaning: string };

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, "");
}

/** 시험지 QR — 변형문제 연계 단어학습 (로그인 불필요) */
export function buildExamVocabUrl(setId: string): string {
  return `${siteBase()}/exam-vocab/${setId}`;
}

/** 보기·중요 단어 → 동사/명사 원형 (복수·과거·3인칭 등 제거) */
export function lemmaHardWordForm(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const cleaned = tok.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, "");
      if (!cleaned) return "";
      return lemmaEnglishToken(cleaned);
    })
    .filter(Boolean)
    .join(" ");
}

/** 보기 단어·QR 학습에서 제외할 쉬운 고빈도어 (중고등 기본 어휘) */
const EASY_HARD_WORD_SKIP = new Set(
  [
    // 기능어·대명사·조동사
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
    "get",
    "got",
    "go",
    "went",
    "come",
    "came",
    "make",
    "made",
    "take",
    "took",
    "give",
    "gave",
    "given",
    "see",
    "saw",
    "seen",
    "know",
    "knew",
    "known",
    "think",
    "thought",
    "say",
    "said",
    "tell",
    "told",
    "ask",
    "want",
    "need",
    "like",
    "love",
    "use",
    "used",
    "try",
    "tried",
    "find",
    "found",
    "put",
    "let",
    "keep",
    "kept",
    "feel",
    "felt",
    "become",
    "became",
    "leave",
    "left",
    "call",
    "called",
    "show",
    "showed",
    "shown",
    "help",
    "helped",
    "work",
    "worked",
    "play",
    "played",
    "live",
    "lived",
    "look",
    "looked",
    "seem",
    "seemed",
    "start",
    "started",
    "stop",
    "stopped",
    "open",
    "opened",
    "close",
    "closed",
    "move",
    "moved",
    "run",
    "ran",
    "walk",
    "walked",
    "buy",
    "bought",
    "sell",
    "sold",
    "pay",
    "paid",
    "read",
    "write",
    "wrote",
    "written",
    "learn",
    "learned",
    "study",
    "studied",
    "teach",
    "taught",
    "change",
    "changed",
    "happen",
    "happened",
    "create",
    "created",
    "include",
    "included",
    "provide",
    "provided",
    "allow",
    "allowed",
    "require",
    "required",
    "decide",
    "decided",
    "suggest",
    "suggested",
    "mean",
    "meant",
    "believe",
    "believed",
    "understand",
    "understood",
    "remember",
    "remembered",
    "forget",
    "forgot",
    "bring",
    "brought",
    "carry",
    "carried",
    "hold",
    "held",
    "follow",
    "followed",
    "lead",
    "led",
    "grow",
    "grew",
    "grown",
    "build",
    "built",
    "cut",
    "set",
    "turn",
    "turned",
    "add",
    "added",
    "check",
    "checked",
    "choose",
    "chose",
    "chosen",
    "spend",
    "spent",
    "save",
    "saved",
    "send",
    "sent",
    "receive",
    "received",
    "expect",
    "expected",
    "hope",
    "hoped",
    "plan",
    "planned",
    "offer",
    "offered",
    "cause",
    "caused",
    "result",
    "results",
    "increase",
    "increased",
    "reduce",
    "reduced",
    "improve",
    "improved",
    "develop",
    "developed",
    "produce",
    "produced",
    "support",
    "supported",
    "protect",
    "protected",
    "control",
    "controlled",
    "share",
    "shared",
    "join",
    "joined",
    "meet",
    "met",
    "visit",
    "visited",
    "travel",
    "traveled",
    "travelled",
    "enjoy",
    "enjoyed",
    "prefer",
    "preferred",
    "agree",
    "agreed",
    "disagree",
    "disagreed",
    "argue",
    "argued",
    "explain",
    "explained",
    "describe",
    "described",
    "compare",
    "compared",
    "consider",
    "considered",
    "continue",
    "continued",
    "remain",
    "remained",
    "appear",
    "appeared",
    "exist",
    "existed",
    "depend",
    "depended",
    "base",
    "based",
    "focus",
    "focused",
    "relate",
    "related",
    "affect",
    "affected",
    "effect",
    "effects",
    "point",
    "points",
    "part",
    "parts",
    "place",
    "places",
    "area",
    "areas",
    "way",
    "ways",
    "case",
    "cases",
    "fact",
    "facts",
    "idea",
    "ideas",
    "problem",
    "problems",
    "question",
    "questions",
    "answer",
    "answers",
    "reason",
    "reasons",
    "example",
    "examples",
    "story",
    "stories",
    "number",
    "numbers",
    "group",
    "groups",
    "system",
    "systems",
    "process",
    "processes",
    "level",
    "levels",
    "type",
    "types",
    "kind",
    "kinds",
    "form",
    "forms",
    "role",
    "roles",
    "side",
    "sides",
    "end",
    "ends",
    "line",
    "lines",
    "view",
    "views",
    "order",
    "orders",
    "power",
    "powers",
    "value",
    "values",
    "interest",
    "interests",
    "service",
    "services",
    "product",
    "products",
    "market",
    "markets",
    "business",
    "company",
    "companies",
    "industry",
    "industries",
    "government",
    "governments",
    "society",
    "societies",
    "community",
    "communities",
    "culture",
    "cultures",
    "history",
    "nature",
    "world",
    "country",
    "countries",
    "city",
    "cities",
    "town",
    "towns",
    "school",
    "schools",
    "student",
    "students",
    "teacher",
    "teachers",
    "class",
    "classes",
    "university",
    "universities",
    "college",
    "colleges",
    "education",
    "research",
    "study",
    "studies",
    "science",
    "technology",
    "information",
    "data",
    "computer",
    "computers",
    "internet",
    "media",
    "news",
    "art",
    "music",
    "book",
    "books",
    "movie",
    "movies",
    "film",
    "films",
    "game",
    "games",
    "sport",
    "sports",
    "food",
    "water",
    "money",
    "price",
    "prices",
    "cost",
    "costs",
    "job",
    "jobs",
    "work",
    "worker",
    "workers",
    "consumer",
    "consumers",
    "customer",
    "customers",
    "user",
    "users",
    "person",
    "people",
    "man",
    "men",
    "woman",
    "women",
    "child",
    "children",
    "kid",
    "kids",
    "boy",
    "boys",
    "girl",
    "girls",
    "family",
    "families",
    "friend",
    "friends",
    "parent",
    "parents",
    "member",
    "members",
    "human",
    "humans",
    "life",
    "lives",
    "death",
    "health",
    "body",
    "bodies",
    "mind",
    "minds",
    "hand",
    "hands",
    "eye",
    "eyes",
    "face",
    "faces",
    "head",
    "heads",
    "heart",
    "hearts",
    "time",
    "times",
    "day",
    "days",
    "week",
    "weeks",
    "month",
    "months",
    "year",
    "years",
    "hour",
    "hours",
    "minute",
    "minutes",
    "today",
    "tomorrow",
    "yesterday",
    "morning",
    "evening",
    "night",
    "nights",
    "future",
    "past",
    "present",
    "age",
    "ages",
    "home",
    "homes",
    "house",
    "houses",
    "room",
    "rooms",
    "door",
    "doors",
    "car",
    "cars",
    "road",
    "roads",
    "space",
    "spaces",
    "thing",
    "things",
    "something",
    "anything",
    "everything",
    "nothing",
    "someone",
    "anyone",
    "everyone",
    "someone",
    "other",
    "others",
    "another",
    "same",
    "different",
    "new",
    "old",
    "young",
    "good",
    "better",
    "best",
    "bad",
    "worse",
    "worst",
    "big",
    "small",
    "large",
    "little",
    "long",
    "short",
    "high",
    "low",
    "early",
    "late",
    "fast",
    "slow",
    "hard",
    "easy",
    "important",
    "possible",
    "available",
    "special",
    "common",
    "public",
    "private",
    "personal",
    "social",
    "local",
    "national",
    "international",
    "natural",
    "real",
    "true",
    "false",
    "right",
    "wrong",
    "sure",
    "clear",
    "simple",
    "main",
    "major",
    "basic",
    "general",
    "specific",
    "similar",
    "various",
    "several",
    "many",
    "much",
    "more",
    "most",
    "some",
    "any",
    "all",
    "each",
    "every",
    "both",
    "few",
    "lot",
    "lots",
    "enough",
    "only",
    "also",
    "even",
    "still",
    "already",
    "always",
    "never",
    "often",
    "sometimes",
    "usually",
    "really",
    "very",
    "too",
    "quite",
    "just",
    "almost",
    "about",
    "around",
    "over",
    "under",
    "through",
    "between",
    "among",
    "during",
    "before",
    "after",
    "since",
    "until",
    "while",
    "because",
    "although",
    "though",
    "however",
    "therefore",
    "thus",
    "then",
    "now",
    "here",
    "there",
    "up",
    "down",
    "out",
    "off",
    "into",
    "onto",
    "upon",
    "without",
    "within",
    "across",
    "along",
    "against",
    "toward",
    "towards",
    "yes",
    "well",
    "back",
    "away",
    "again",
    "once",
    "twice",
    "first",
    "second",
    "third",
    "last",
    "next",
    "own",
    "such",
    "able",
    "unable",
    "full",
    "empty",
    "free",
    "safe",
    "strong",
    "weak",
    "happy",
    "sad",
    "afraid",
    "ready",
    "sure",
    "certain",
    "likely",
    "unlikely",
    "useful",
    "useless",
    "successful",
    "necessary",
    "unnecessary",
    "positive",
    "negative",
    "modern",
    "traditional",
    "popular",
    "famous",
    "rich",
    "poor",
    "hot",
    "cold",
    "warm",
    "cool",
    "dark",
    "light",
    "heavy",
    "soft",
    "clean",
    "dirty",
    "quiet",
    "loud",
    "beautiful",
    "ugly",
    "interesting",
    "boring",
    "difficult",
    "simple",
    "complex",
    "complete",
    "incomplete",
    "final",
    "total",
    "whole",
    "half",
    "single",
    "double",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "online",
    "offline",
    "global",
    "economic",
    "political",
    "environmental",
    "cultural",
    "medical",
    "physical",
    "mental",
    "emotional",
    "financial",
    "digital",
    "original",
    "normal",
    "regular",
    "standard",
    "average",
    "recent",
    "current",
    "previous",
    "following",
    "according",
    "including",
    "regarding",
    "progress",
    "success",
    "failure",
    "effort",
    "experience",
    "knowledge",
    "skill",
    "skills",
    "ability",
    "abilities",
    "opportunity",
    "opportunities",
    "challenge",
    "challenges",
    "goal",
    "goals",
    "purpose",
    "purposes",
    "benefit",
    "benefits",
    "risk",
    "risks",
    "danger",
    "dangers",
    "safety",
    "quality",
    "quantity",
    "amount",
    "amounts",
    "size",
    "sizes",
    "speed",
    "energy",
    "force",
    "pressure",
    "temperature",
    "weather",
    "environment",
    "pollution",
    "climate",
    "earth",
    "animal",
    "animals",
    "plant",
    "plants",
    "tree",
    "trees",
    "color",
    "colour",
    "colors",
    "colours",
    "sound",
    "sounds",
    "image",
    "images",
    "picture",
    "pictures",
    "photo",
    "photos",
    "video",
    "videos",
    "message",
    "messages",
    "letter",
    "letters",
    "email",
    "emails",
    "phone",
    "phones",
    "language",
    "languages",
    "word",
    "words",
    "sentence",
    "sentences",
    "meaning",
    "meanings",
    "definition",
    "definitions",
    "term",
    "terms",
    "name",
    "names",
    "title",
    "titles",
    "topic",
    "topics",
    "subject",
    "subjects",
    "content",
    "contents",
    "detail",
    "details",
    "summary",
    "summaries",
    "report",
    "reports",
    "article",
    "articles",
    "text",
    "texts",
    "page",
    "pages",
    "list",
    "lists",
    "table",
    "tables",
    "figure",
    "figures",
    "graph",
    "graphs",
    "chart",
    "charts",
    "model",
    "models",
    "method",
    "methods",
    "way",
    "approach",
    "approaches",
    "strategy",
    "strategies",
    "solution",
    "solutions",
    "decision",
    "decisions",
    "choice",
    "choices",
    "option",
    "options",
    "action",
    "actions",
    "activity",
    "activities",
    "event",
    "events",
    "situation",
    "situations",
    "condition",
    "conditions",
    "state",
    "states",
    "status",
    "position",
    "positions",
    "direction",
    "directions",
    "distance",
    "distances",
    "period",
    "periods",
    "moment",
    "moments",
    "step",
    "steps",
    "stage",
    "stages",
    "rate",
    "rates",
    "percent",
    "percentage",
    "percentages",
    "degree",
    "degrees",
    "range",
    "ranges",
    "limit",
    "limits",
    "rule",
    "rules",
    "law",
    "laws",
    "right",
    "rights",
    "duty",
    "duties",
    "responsibility",
    "responsibilities",
    "freedom",
    "peace",
    "war",
    "wars",
    "conflict",
    "conflicts",
    "issue",
    "issues",
    "matter",
    "matters",
    "concern",
    "concerns",
    "attention",
    "care",
    "respect",
    "trust",
    "honesty",
    "courage",
    "patience",
    "confidence",
    "pride",
    "shame",
    "fear",
    "anger",
    "joy",
    "pain",
    "pleasure",
    "fun",
    "hobby",
    "hobbies",
    "habit",
    "habits",
    "dream",
    "dreams",
    "wish",
    "wishes",
    "desire",
    "desires",
    "need",
    "needs",
    "want",
    "wants",
    "demand",
    "demands",
    "supply",
    "supplies",
    "trade",
    "trades",
    "deal",
    "deals",
    "contract",
    "contracts",
    "agreement",
    "agreements",
    "relationship",
    "relationships",
    "connection",
    "connections",
    "difference",
    "differences",
    "similarity",
    "similarities",
    "advantage",
    "advantages",
    "disadvantage",
    "disadvantages",
    "strength",
    "strengths",
    "weakness",
    "weaknesses",
    "feature",
    "features",
    "character",
    "characters",
    "personality",
    "behavior",
    "behaviour",
    "attitude",
    "attitudes",
    "opinion",
    "opinions",
    "belief",
    "beliefs",
    "theory",
    "theories",
    "practice",
    "practices",
    "training",
    "practice",
    "test",
    "tests",
    "exam",
    "exams",
    "grade",
    "grades",
    "score",
    "scores",
    "mark",
    "marks",
    "pass",
    "fail",
    "win",
    "won",
    "lose",
    "lost",
    "team",
    "teams",
    "player",
    "players",
    "audience",
    "viewer",
    "viewers",
    "reader",
    "readers",
    "writer",
    "writers",
    "author",
    "authors",
    "speaker",
    "speakers",
    "listener",
    "listeners",
    "leader",
    "leaders",
    "manager",
    "managers",
    "doctor",
    "doctors",
    "patient",
    "patients",
    "nurse",
    "nurses",
    "engineer",
    "engineers",
    "scientist",
    "scientists",
    "artist",
    "artists",
    "actor",
    "actors",
    "actress",
    "farmer",
    "farmers",
    "driver",
    "drivers",
    "tourist",
    "tourists",
    "guest",
    "guests",
    "host",
    "hosts",
    "owner",
    "owners",
    "boss",
    "bosses",
    "employee",
    "employees",
    "staff",
    "partner",
    "partners",
    "neighbor",
    "neighbour",
    "neighbors",
    "neighbours",
    "stranger",
    "strangers",
    "citizen",
    "citizens",
    "adult",
    "adults",
    "teenager",
    "teenagers",
    "baby",
    "babies",
  ].map((w) => w.toLowerCase())
);

/** 중고등 기본 수준이라 보기 단어·QR에서 제외 */
export function isTooEasyHardWord(word: string): boolean {
  const raw = lemmaHardWordForm(String(word ?? "").trim());
  if (!raw) return true;
  const parts = raw
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z']/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return true;
  // 1~2글자 기능어만 무조건 제외. 3글자라도 목록에 없으면 유지(swap급 짧은 난단어 허용)
  if (parts.length === 1 && parts[0].length <= 2) return true;
  return parts.every((p) => EASY_HARD_WORD_SKIP.has(p) || p.length <= 2);
}

/** 비정상·합성 괴물 어휘 (national monies 등) */
const WEIRD_HARD_WORD_SKIP = new Set(
  [
    "monies",
    "moneys",
    "datas",
    "informations",
    "advices",
    "furnitures",
    "equipments",
    "softwares",
    "hardwares",
    "stuffs",
    "homeworks",
    "luggages",
    "traffics",
    "knowledges",
    "researches",
  ].map((w) => w.toLowerCase())
);

/**
 * 보기 단어로 쓸 수 없는 항목:
 * - 두 단어 이상 구 (national monies 등)
 * - 비정상 복수·괴물형
 * - 쉬운 단어
 */
export function isInvalidHardWord(word: string): boolean {
  const original = String(word ?? "").trim();
  if (!original) return true;
  // 단일어만 허용 (공백·하이픈 구 금지)
  if (/[\s/]/.test(original) || (original.match(/-/g) ?? []).length > 1) {
    return true;
  }
  const raw = lemmaHardWordForm(original).toLowerCase().trim();
  const token = raw.replace(/[^a-z']/g, "");
  if (!token) return true;
  if (/\s/.test(raw)) return true;
  if (WEIRD_HARD_WORD_SKIP.has(token)) return true;
  // money류 오복수·어색한 -ies 잔존
  if (/^(monies|moneys)$/.test(token)) return true;
  if (isTooEasyHardWord(token)) return true;
  return false;
}

function normalizeHardWords(raw: unknown): HardWord[] {
  if (!Array.isArray(raw)) return [];
  const out: HardWord[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const original = String(
      (item as { word?: unknown }).word ?? ""
    ).trim();
    if (isInvalidHardWord(original)) continue;
    const word = lemmaHardWordForm(original);
    const meaning = String(
      (item as { meaning?: unknown }).meaning ??
        (item as { meaningKo?: unknown }).meaningKo ??
        ""
    ).trim();
    if (!word || !meaning) continue;
    if (isInvalidHardWord(word)) continue;
    if (word.length > 40 || meaning.length > 80) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word, meaning });
  }
  return out.slice(0, 12);
}

export const normalizeHardWordsFromRaw = normalizeHardWords;

export function parseHardWordsColumn(raw: unknown): HardWord[] {
  return normalizeHardWords(raw);
}

/** QR·단어장용: 원형 기준 중복 제거 (progress/Progress, allows/allow 등) */
export function hardWordDedupeKey(word: string): string {
  return lemmaHardWordForm(word)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function dedupeHardWords(words: HardWord[]): HardWord[] {
  const byKey = new Map<string, HardWord>();
  for (const item of words) {
    const original = String(item.word ?? "").trim();
    if (isInvalidHardWord(original)) continue;
    const word = lemmaHardWordForm(original);
    const meaning = String(item.meaning ?? "").trim();
    if (!word || !meaning) continue;
    if (isInvalidHardWord(word)) continue;
    if (word.length > 40 || meaning.length > 80) continue;
    const key = hardWordDedupeKey(word);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { word, meaning });
      continue;
    }
    if (meaning.length > prev.meaning.length) {
      byKey.set(key, { word: prev.word, meaning });
    }
  }
  return [...byKey.values()];
}

/** DB vocab_items 행 중복 제거 (학습 카드용) */
export function dedupeVocabItemRows<
  T extends { word: string; meaning: string; order_index?: number | null },
>(items: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const original = String(item.word ?? "").trim();
    if (isInvalidHardWord(original)) continue;
    const word = lemmaHardWordForm(original);
    const meaning = String(item.meaning ?? "").trim();
    if (!word || !meaning) continue;
    if (isInvalidHardWord(word)) continue;
    const key = hardWordDedupeKey(word);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...item, word, meaning });
      continue;
    }
    if (meaning.length > String(prev.meaning ?? "").trim().length) {
      byKey.set(key, { ...prev, meaning });
    }
  }
  return [...byKey.values()].map((row, i) => ({
    ...row,
    order_index: i,
  }));
}

/**
 * 해설지 «보기 단어»·QR 단어장에 포함할지.
 * - 영어 선지 객관식
 * - 일치개수(content_count): 하단 선지 없이 <보기> 진술·지문 어휘
 */
export function choicesNeedVocabGloss(
  choices:
    | Array<{ number?: number; text?: string } | null>
    | null
    | undefined
): boolean {
  if (!choices?.length) return false;
  let englishish = 0;
  for (const c of choices) {
    const t = String(c?.text ?? "").trim();
    if (!t) continue;
    if (/^\d+\s*개$/.test(t)) continue;
    const latin = (t.match(/[A-Za-z]/g) ?? []).length;
    const hangul = (t.match(/[\uAC00-\uD7A3]/g) ?? []).length;
    if (latin >= 3 && latin > hangul) englishish += 1;
  }
  return englishish >= 2;
}

export function questionNeedsVocabGloss(input: {
  choices?:
    | Array<{ number?: number; text?: string } | null>
    | null
    | undefined;
  questionType?: string | null;
  optionKey?: string | null;
  questionText?: string | null;
  choiceLanguage?: string | null;
}): boolean {
  if (choicesNeedVocabGloss(input.choices)) return true;

  const type = (input.questionType || "").trim();
  const key = (input.optionKey || "").trim();
  const isContentCount =
    type === "content_count" ||
    key.startsWith("content_count:") ||
    key.includes(":일치개수");

  if (isContentCount) return true;

  // 저장된 hard_words가 있어도, 유형 정보가 비어 있으면 영어 <보기> 진술로 추정
  const qt = input.questionText || "";
  if (/<보기>/.test(qt)) {
    const latin = (qt.match(/[A-Za-z]/g) ?? []).length;
    const hangul = (qt.match(/[\uAC00-\uD7A3]/g) ?? []).length;
    if (latin >= 40 && latin > hangul) return true;
  }

  return false;
}

/**
 * 생성 완료 job의 문항 hard_words를 모아 exam_compact 단어장으로 동기화.
 * 기존 vocab_set_id가 있으면 단어만 갱신.
 */
export async function syncExamVocabSetFromJob(jobId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("question_generation_jobs")
    .select("id, created_by, request_config, vocab_set_id, total_completed")
    .eq("id", jobId)
    .single();

  if (error || !job) return null;
  if ((job.total_completed ?? 0) < 1) return null;

  const { data: questions } = await admin
    .from("generated_english_questions")
    .select(
      "hard_words, choices, instruction, question_type, option_key, question_text, choice_language"
    )
    .eq("generation_job_id", jobId)
    .order("created_at", { ascending: true });

  const merged: HardWord[] = [];
  for (const q of questions ?? []) {
    if (
      !questionNeedsVocabGloss({
        choices: q.choices as Array<{ text?: string }> | null,
        questionType: q.question_type as string | null,
        optionKey: q.option_key as string | null,
        questionText: q.question_text as string | null,
        choiceLanguage: q.choice_language as string | null,
      })
    ) {
      continue;
    }
    for (const w of normalizeHardWords(q.hard_words)) {
      merged.push(w);
    }
  }

  const unique = dedupeHardWords(merged);
  if (unique.length === 0) return (job.vocab_set_id as string | null) ?? null;

  const cfg = (job.request_config ?? {}) as { title?: string; grade?: string };
  const titleBase = (cfg.title || "변형문제").trim() || "변형문제";
  const setTitle = `${titleBase} · 보기 단어`.slice(0, 80);
  const description = `변형문제 해설 연계 단어장 (1·2·4단계). ${cfg.grade ?? ""}`.trim();
  const teacherId = job.created_by as string;

  let setId = (job.vocab_set_id as string | null) ?? null;

  if (setId) {
    await admin
      .from("vocab_sets")
      .update({
        title: setTitle,
        description,
        exam_compact: true,
        source_job_id: jobId,
        is_published: true,
      })
      .eq("id", setId);
  } else {
    const { data: created, error: cErr } = await admin
      .from("vocab_sets")
      .insert({
        title: setTitle,
        description,
        teacher_id: teacherId,
        created_by: teacherId,
        is_published: true,
        exam_compact: true,
        source_job_id: jobId,
        folder_id: null,
        order_index: 0,
      })
      .select("id")
      .single();
    if (cErr || !created) {
      console.error("exam vocab set create failed", cErr);
      return null;
    }
    setId = created.id as string;
    await admin
      .from("question_generation_jobs")
      .update({ vocab_set_id: setId })
      .eq("id", jobId);
  }

  const persist = await persistVocabItems(
    admin,
    setId,
    unique.map((w, i) => ({
      word: w.word,
      meaning: w.meaning,
      order_index: i,
    }))
  );
  if (!persist.ok) {
    console.error("exam vocab items persist failed", persist.message);
  }

  return setId;
}

/** 로그인한 학생이 exam_compact 단어장에 직접 배정되도록 보장 */
export async function ensureStudentExamVocabAssignment(
  studentId: string,
  setId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: set } = await admin
    .from("vocab_sets")
    .select("id, exam_compact, is_published")
    .eq("id", setId)
    .maybeSingle();

  if (!set?.is_published || !set.exam_compact) return false;

  const { data: existing } = await admin
    .from("vocab_assignments")
    .select("id")
    .eq("set_id", setId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) return true;

  const { error } = await admin.from("vocab_assignments").insert({
    set_id: setId,
    student_id: studentId,
    class_id: null,
    assigned_by: studentId,
  });

  return !error;
}

/** exam_compact: 2단계 완료 시 3단계를 자동 완료 처리해 4단계 해금 */
export async function ensureExamCompactStageSkip(
  studentId: string,
  setId: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: set } = await admin
    .from("vocab_sets")
    .select("exam_compact")
    .eq("id", setId)
    .maybeSingle();
  if (!set?.exam_compact) return;

  const { data: progress } = await admin
    .from("vocab_stage_progress")
    .select("id, stage2_completed, stage3_completed")
    .eq("student_id", studentId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!progress?.stage2_completed || progress.stage3_completed) return;

  await admin
    .from("vocab_stage_progress")
    .update({
      stage3_completed: true,
      stage3_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", progress.id);
}

/**
 * 같은 지문 문항들 사이에서 hard_words 중복을 줄인다.
 * 고유 단어는 해당 문항에, 공유 단어는 아직 단어가 적은 문항에만 배정.
 */
export async function diversifyJobHardWords(jobId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("generated_english_questions")
    .select(
      "id, passage_id, hard_words, choices, question_type, option_key, question_text, choice_language"
    )
    .eq("generation_job_id", jobId)
    .order("created_at", { ascending: true });

  if (!questions?.length) return;

  const byPassage = new Map<string, typeof questions>();
  for (const q of questions) {
    const pid = String(q.passage_id ?? "");
    if (!byPassage.has(pid)) byPassage.set(pid, []);
    byPassage.get(pid)!.push(q);
  }

  for (const group of byPassage.values()) {
    const eligible = group.filter((q) =>
      questionNeedsVocabGloss({
        choices: q.choices as Array<{ text?: string }> | null,
        questionType: q.question_type as string | null,
        optionKey: q.option_key as string | null,
        questionText: q.question_text as string | null,
        choiceLanguage: q.choice_language as string | null,
      })
    );
    if (eligible.length <= 1) continue;

    type Row = { id: string; words: HardWord[] };
    const perQ: Row[] = eligible.map((q) => ({
      id: q.id as string,
      words: normalizeHardWords(q.hard_words),
    }));

    const assigned = new Map<string, HardWord[]>();
    for (const row of perQ) assigned.set(row.id, []);

    const owners = new Map<string, { ids: string[]; word: HardWord }>();
    for (const row of perQ) {
      for (const w of row.words) {
        const k = hardWordDedupeKey(w.word);
        if (!k) continue;
        const cur = owners.get(k);
        if (!cur) owners.set(k, { ids: [row.id], word: w });
        else if (!cur.ids.includes(row.id)) cur.ids.push(row.id);
      }
    }

    const claimed = new Set<string>();

    // 1) 한 문항에만 있는 단어 → 그 문항
    for (const [k, info] of owners) {
      if (info.ids.length !== 1) continue;
      const id = info.ids[0]!;
      const list = assigned.get(id)!;
      if (list.length >= 8) continue;
      list.push(info.word);
      claimed.add(k);
    }

    // 2) 여러 문항 공유 단어 → 현재 개수가 적은 문항 우선
    for (const [k, info] of owners) {
      if (claimed.has(k)) continue;
      const pick = [...info.ids]
        .map((id) => ({ id, n: assigned.get(id)!.length }))
        .filter((x) => x.n < 6)
        .sort((a, b) => a.n - b.n)[0];
      if (!pick) continue;
      assigned.get(pick.id)!.push(info.word);
      claimed.add(k);
    }

    for (const [id, words] of assigned) {
      const unique = dedupeHardWords(words).slice(0, 8);
      await admin
        .from("generated_english_questions")
        .update({ hard_words: unique, updated_at: new Date().toISOString() })
        .eq("id", id);
    }
  }
}
