import { createAdminClient } from "@/lib/supabase/admin";
import { persistVocabItems } from "@/lib/vocab/save-items";
import { SITE_URL } from "@/lib/branding";
import { lemmaEnglishToken } from "@/lib/question-generator/word-order-normalize";

export type HardWord = { word: string; meaning: string };

/**
 * 중3 ≈ 미국 Grade 8 (MetaMetrics / CCSS Appendix A)
 * - Grade 8 text complexity: 1010L–1185L
 * - Grade 8 reader mid-year IQR: ~985L–1295L
 * 보기 단어: 이 대역(≥약 1000L)에 해당하는 어휘와 그 이상만 정리.
 * 단어별 공식 Lexile API는 비공개이므로 아래 프록시로 근사한다.
 */
export const JUNGA3_LEXILE_FLOOR = 1000;

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

/**
 * 렉사일 ~1000L 미만(초등~중학 초반 교실 영어)에 해당하는 초고빈도·기능어.
 * 목록에 있으면 무조건 제외.
 */
const BELOW_JUNGA3_SKIP = new Set(
  [
    "a", "an", "the", "to", "of", "in", "on", "at", "for", "from", "with", "by",
    "as", "if", "or", "and", "but", "not", "no", "so", "than", "that", "this",
    "these", "those", "it", "its", "they", "them", "their", "he", "she", "him",
    "her", "we", "us", "our", "you", "your", "i", "me", "my", "who", "which",
    "what", "when", "where", "why", "how", "will", "would", "can", "could",
    "shall", "should", "may", "might", "must", "do", "does", "did", "be", "am",
    "is", "are", "was", "were", "been", "being", "have", "has", "had", "having",
    "get", "got", "go", "went", "come", "came", "make", "made", "take", "took",
    "give", "gave", "given", "say", "said", "tell", "told", "see", "saw", "seen",
    "know", "knew", "known", "think", "thought", "want", "wanted", "like", "liked",
    "need", "needed", "use", "used", "help", "helped", "work", "worked", "play",
    "played", "live", "lived", "look", "looked", "find", "found", "put", "keep",
    "kept", "let", "begin", "began", "begun", "seem", "seemed", "feel", "felt",
    "try", "tried", "leave", "left", "call", "called", "ask", "asked", "show",
    "showed", "shown", "hear", "heard", "move", "moved", "run", "ran", "walk",
    "walked", "sit", "sat", "stand", "stood", "read", "write", "wrote", "written",
    "speak", "spoke", "spoken", "talk", "talked", "listen", "listened", "learn",
    "learned", "learnt", "teach", "taught", "study", "studied", "eat", "ate",
    "eaten", "drink", "drank", "buy", "bought", "sell", "sold", "pay", "paid",
    "open", "opened", "close", "closed", "start", "started", "stop", "stopped",
    "people", "person", "man", "men", "woman", "women", "child", "children",
    "boy", "girl", "friend", "family", "home", "house", "school", "student",
    "teacher", "class", "day", "days", "time", "year", "years", "week", "month",
    "today", "tomorrow", "yesterday", "morning", "night", "thing", "things",
    "way", "ways", "place", "places", "world", "life", "lives", "job",
    "money", "food", "water", "book", "books", "word", "words", "name", "names",
    "number", "numbers", "good", "bad", "big", "small", "long", "short", "new",
    "old", "young", "high", "low", "many", "much", "more", "most", "some", "any",
    "all", "each", "every", "other", "another", "same", "different", "first",
    "last", "next", "important", "easy", "hard", "happy", "sad", "right", "wrong",
    "true", "false", "yes", "very", "also", "just", "only", "even", "still",
    "already", "always", "never", "often", "sometimes", "here", "there", "now",
    "then", "too", "well", "back", "up", "down", "out", "over", "after", "before",
    "about", "into", "through", "during", "without", "because", "while", "until",
    "really", "please", "thanks", "hello", "ok", "okay",
    "color", "colour", "red", "blue", "green", "black", "white", "mother", "father",
    "brother", "sister", "dog", "cat", "apple", "city", "town", "country", "english",
    "korea", "korean", "love", "loved", "hate", "fun", "nice", "pretty", "clean",
    "dirty", "hot", "cold", "fast", "slow", "early", "late", "busy", "free",
    "ready", "sure", "again", "away", "near", "far", "under", "above", "between",
    "among", "both", "few", "lot", "lots", "kind", "such", "own", "once", "twice",
    "half", "enough", "almost", "together", "alone", "someone", "anyone", "everyone",
    "something", "anything", "everything", "nothing", "somewhere", "anywhere",
  ].map((w) => w.toLowerCase())
);

/**
 * MetaMetrics 단어 Lexile 대용 프록시 (L 단위).
 * 길이·접사로 academic/mid-band 단어를 ~1000L+로 올리고, 초고빈도 목록은 낮게 둔다.
 */
export function estimateLexileProxy(word: string): number {
  const w = lemmaHardWordForm(word).toLowerCase().replace(/[^a-z']/g, "");
  if (!w) return 0;
  if (BELOW_JUNGA3_SKIP.has(w)) return 400;
  // len6≈1000, len7≈1030, len8≈1060 … (중3 바닥 ~1000L에 맞춤)
  let L = 820 + Math.min(w.length, 14) * 30;
  if (
    /(?:ize|ise|ous|ive|tion|sion|ance|ence|ment|ship|ology|graphy|phobia|esque|ible|able)$/.test(
      w
    )
  ) {
    L += 120;
  }
  if (/^(un|in|im|ir|dis|mis|over|under|re|pre|non|anti)/.test(w) && w.length >= 6) {
    L += 80;
  }
  if (/[jqxz]/.test(w)) L += 40;
  // 짧은 비기초 어간 (swap, skim, grasp…) — 3글자 이하 교실 영어는 제외
  if (w.length >= 4 && w.length <= 5) L += 120;
  return Math.max(200, Math.min(1600, Math.round(L)));
}

/** 해설지·QR 정렬용 (높을수록 우선) */
export function hardWordPriorityScore(word: string): number {
  return estimateLexileProxy(word);
}

function sortHardWordsByPriority(words: HardWord[]): HardWord[] {
  return [...words].sort(
    (a, b) =>
      hardWordPriorityScore(b.word) - hardWordPriorityScore(a.word) ||
      a.word.localeCompare(b.word)
  );
}

/** 중3 Lexile(~1000L) 미만이라 보기 단어·QR에서 제외 */
export function isTooEasyHardWord(word: string): boolean {
  const raw = lemmaHardWordForm(String(word ?? "").trim());
  if (!raw) return true;
  const parts = raw
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z']/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return true;
  if (parts.length === 1 && parts[0]!.length <= 2) return true;
  return parts.every(
    (p) =>
      p.length <= 2 ||
      BELOW_JUNGA3_SKIP.has(p) ||
      estimateLexileProxy(p) < JUNGA3_LEXILE_FLOOR
  );
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
 * - 두 단어 이상 구
 * - 비정상 복수·괴물형
 * - 중3 Lexile(~1000L) 미만
 */
export function isInvalidHardWord(word: string): boolean {
  const original = String(word ?? "").trim();
  if (!original) return true;
  if (/[\s/]/.test(original) || (original.match(/-/g) ?? []).length > 1) {
    return true;
  }
  const raw = lemmaHardWordForm(original).toLowerCase().trim();
  const token = raw.replace(/[^a-z']/g, "");
  if (!token) return true;
  if (/\s/.test(raw)) return true;
  if (WEIRD_HARD_WORD_SKIP.has(token)) return true;
  if (/^(monies|moneys)$/.test(token)) return true;
  if (isTooEasyHardWord(token)) return true;
  return false;
}


function normalizeHardWords(raw: unknown, limit = 12): HardWord[] {
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
  // 어려운 단어 우선 보존 (쉬운 것만 남는 현상 완화)
  return sortHardWordsByPriority(out).slice(0, limit);
}

export function normalizeHardWordsFromRaw(raw: unknown): HardWord[] {
  return normalizeHardWords(raw);
}

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
  return sortHardWordsByPriority([...byKey.values()]);
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
 * 중3 Lexile(~1000L) 이상 단어만 포함.
 */
export async function syncExamVocabSetFromJob(
  jobId: string
): Promise<string | null> {
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

  const cfg = (job.request_config ?? {}) as { title?: string; grade?: string };

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

  const titleBase = (cfg.title || "변형문제").trim() || "변형문제";
  const setTitle = `${titleBase} · 보기 단어`.slice(0, 80);
  const description =
    `변형문제 해설 연계 단어장 (1·2·4단계). ${cfg.grade ?? ""}`.trim();
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
    if (eligible.length <= 1) {
      // 단일 문항도 수준 필터·난이도 정렬 적용
      for (const q of eligible) {
        const words = normalizeHardWords(q.hard_words, 8);
        await admin
          .from("generated_english_questions")
          .update({ hard_words: words, updated_at: new Date().toISOString() })
          .eq("id", q.id);
      }
      continue;
    }

    type Row = { id: string; words: HardWord[] };
    const perQ: Row[] = eligible.map((q) => ({
      id: q.id as string,
      words: normalizeHardWords(q.hard_words, 12),
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

    // 어려운 고유·공유 단어부터 배치
    const ownerEntries = [...owners.entries()].sort(
      (a, b) =>
        hardWordPriorityScore(b[1].word.word) -
        hardWordPriorityScore(a[1].word.word)
    );

    // 1) 한 문항에만 있는 단어 → 그 문항
    for (const [k, info] of ownerEntries) {
      if (info.ids.length !== 1) continue;
      const id = info.ids[0]!;
      const list = assigned.get(id)!;
      if (list.length >= 8) continue;
      list.push(info.word);
      claimed.add(k);
    }

    // 2) 여러 문항 공유 단어 → 현재 개수가 적은 문항 우선
    for (const [k, info] of ownerEntries) {
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
