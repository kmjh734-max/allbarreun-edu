export interface PassageVocabItem {
  word: string;
  meaning: string;
}

export function buildPassageVocabPrompt(passage: string): string {
  return `You are an English vocabulary teacher for Korean middle school students.

Read the passage below and extract vocabulary worth studying.

Rules:
1. Include important words at middle school level or above (skip trivial words like a, the, is, very common words unless part of an idiom).
2. Normalize verbs to base form (lemma): past tense → base (went → go), past participle → base (provided → provide), -ing → base (providing → provide).
3. Include important idioms and useful phrases as single entries (e.g. "look forward to", "take care of"). Use the full phrase as "word".
4. Provide a concise Korean meaning for each entry (dictionary style, can include comma-separated senses).
5. Do not duplicate the same lemma or phrase. One entry per headword/phrase.
6. Order: more important / less common words first, then supporting vocabulary.
7. Maximum 60 entries. If the passage is long, prioritize the most valuable items.

Return ONLY valid JSON (no markdown):
{
  "items": [
    { "word": "provide", "meaning": "제공하다" },
    { "word": "look forward to", "meaning": "~을 고대하다, 기대하다" }
  ]
}

Passage:
"""
${passage.trim()}
"""`;
}

export function normalizePassageVocabItems(
  raw: unknown
): PassageVocabItem[] {
  if (!raw || typeof raw !== "object") return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  const result: PassageVocabItem[] = [];

  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const word = String((entry as PassageVocabItem).word ?? "").trim();
    const meaning = String((entry as PassageVocabItem).meaning ?? "").trim();
    if (!word || !meaning) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ word, meaning });
  }

  return result;
}
