import type { VocabItem } from "@/types/database";
import { buildChoices } from "@/lib/vocab/generate-test-questions";
import type { ExamPrintConfig, ExamQuestionKind } from "@/lib/vocab/vocab-print-exam-config";

export interface PrintExamQuestion {
  kind: ExamQuestionKind;
  number: number;
  prompt: string;
  choices?: string[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankExampleSentence(item: VocabItem): string | null {
  const sentence = item.example_sentence?.trim();
  const word = item.word?.trim();
  if (!sentence || !word) return null;
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  if (!re.test(sentence)) return null;
  return sentence.replace(
    new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi"),
    "______"
  );
}

function itemsWithBlankableExample(items: VocabItem[]): VocabItem[] {
  return items.filter((item) => blankExampleSentence(item) !== null);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickItems(pool: VocabItem[], count: number): VocabItem[] {
  if (count <= 0) return [];
  const shuffled = shuffle(pool);
  const out: VocabItem[] = [];
  for (let i = 0; i < count; i++) {
    out.push(shuffled[i % shuffled.length]!);
  }
  return out;
}

function buildQuestion(
  kind: ExamQuestionKind,
  item: VocabItem,
  pool: VocabItem[]
): PrintExamQuestion | null {
  switch (kind) {
    case "word_mc": {
      const choices = buildChoices(pool, item, (i) => i.meaning);
      if (!choices || choices.length < 2) return null;
      return { kind, number: 0, prompt: item.word, choices };
    }
    case "word_sa":
      return { kind, number: 0, prompt: item.word };
    case "meaning_mc": {
      const choices = buildChoices(pool, item, (i) => i.word);
      if (!choices || choices.length < 2) return null;
      return { kind, number: 0, prompt: item.meaning, choices };
    }
    case "meaning_sa":
      return { kind, number: 0, prompt: item.meaning };
    case "example_mc": {
      const blanked = blankExampleSentence(item);
      if (!blanked) return null;
      const choices = buildChoices(pool, item, (i) => i.word);
      if (!choices || choices.length < 2) return null;
      return { kind, number: 0, prompt: blanked, choices };
    }
    case "example_sa": {
      const blanked = blankExampleSentence(item);
      if (!blanked) return null;
      return { kind, number: 0, prompt: blanked };
    }
    default:
      return null;
  }
}

const KIND_ORDER: { kind: ExamQuestionKind; configKey: keyof ExamPrintConfig }[] =
  [
    { kind: "word_mc", configKey: "word_mc" },
    { kind: "word_sa", configKey: "word_sa" },
    { kind: "meaning_mc", configKey: "meaning_mc" },
    { kind: "meaning_sa", configKey: "meaning_sa" },
    { kind: "example_mc", configKey: "example_mc" },
    { kind: "example_sa", configKey: "example_sa" },
  ];

export function generatePrintExamQuestions(
  items: VocabItem[],
  config: ExamPrintConfig,
  options?: { shuffle?: boolean; shuffleSeed?: number }
): { questions: PrintExamQuestion[]; skipped: number } {
  if (items.length < 2) {
    return { questions: [], skipped: 0 };
  }

  const basicQuestions: PrintExamQuestion[] = [];
  const exampleQuestions: PrintExamQuestion[] = [];
  let skipped = 0;

  const examplePool = itemsWithBlankableExample(items);

  for (const { kind, configKey } of KIND_ORDER) {
    const count = config[configKey];
    if (count <= 0) continue;

    const isExample = kind === "example_mc" || kind === "example_sa";
    const pool = isExample ? examplePool : items;
    if (pool.length === 0) {
      skipped += count;
      continue;
    }

    const picked = pickItems(pool, count);
    const bucket = isExample ? exampleQuestions : basicQuestions;

    for (const item of picked) {
      const q = buildQuestion(kind, item, items);
      if (!q) {
        skipped += 1;
        continue;
      }
      bucket.push(q);
    }
  }

  // shuffleSeed changes re-run generation (e.g. 「순서 다시 섞기」)
  void options?.shuffleSeed;

  const doShuffle = options?.shuffle !== false;
  const orderedBasic = doShuffle ? shuffle(basicQuestions) : basicQuestions;
  const orderedExamples = doShuffle ? shuffle(exampleQuestions) : exampleQuestions;

  return {
    questions: [...orderedBasic, ...orderedExamples].map((q, i) => ({
      ...q,
      number: i + 1,
    })),
    skipped,
  };
}
