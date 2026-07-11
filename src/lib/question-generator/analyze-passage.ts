import { questionGeneratorChatJsonWithRetry } from "@/lib/question-generator/openai";
import type { PassageAnalysis } from "@/lib/question-generator/types";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function emptyAnalysis(): PassageAnalysis {
  return {
    overallTopic: "",
    overallMainIdea: "",
    titleCandidates: [],
    paragraphRoles: [],
    sentenceFacts: [],
    eventRelations: [],
    causeEffect: [],
    compareContrast: [],
    timeOrder: [],
    properNouns: [],
    numbers: [],
    keyVocabulary: [],
    antonymCandidates: [],
    grammarPoints: [],
    insertionClues: [],
    orderClues: [],
    blankCandidates: [],
    writingCandidates: [],
    estimatedDifficulty: "",
    unsuitableTypes: [],
    warnings: [],
  };
}

/** 빠른 요약 분석 (속도 우선) */
export async function analyzePassage(opts: {
  passage: string;
  grade: string;
  overallDifficulty: string;
}): Promise<PassageAnalysis> {
  try {
    const raw = (await questionGeneratorChatJsonWithRetry({
      system: `Summarize this English passage for exam writing. Return ONLY compact JSON. Korean for topic/mainIdea.`,
      user: JSON.stringify({
        grade: opts.grade,
        passage: opts.passage.slice(0, 3500),
        schema: {
          overallTopic: "string",
          overallMainIdea: "string",
          titleCandidates: ["string", "string", "string"],
        },
      }),
      temperature: 0.2,
      maxTokens: 600,
    })) as Record<string, unknown>;

    return {
      ...emptyAnalysis(),
      overallTopic: asString(raw.overallTopic),
      overallMainIdea: asString(raw.overallMainIdea),
      titleCandidates: asStringArray(raw.titleCandidates).slice(0, 5),
    };
  } catch {
    return emptyAnalysis();
  }
}
