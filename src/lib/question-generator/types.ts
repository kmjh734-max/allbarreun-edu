export type QuestionTypeCode =
  | "title"
  | "topic"
  | "summary_mcq"
  | "content_true"
  | "content_false"
  | "content_count"
  | "order"
  | "sentence_blank"
  | "irrelevant_sentence"
  | "sentence_insertion"
  | "underlined_inference"
  | "grammar"
  | "vocabulary"
  | "summary_short"
  | "writing"
  | "short_title"
  | "short_topic";

export type QuestionCategory =
  | "main_idea"
  | "details"
  | "inference"
  | "grammar_vocabulary"
  | "subjective";

export type DifficultyLevel = "low" | "medium" | "high" | "default";

export type ChoiceLanguage = "english" | "korean" | null;

export type JobStatus =
  | "pending"
  | "analyzing"
  | "generating"
  | "validating"
  | "partially_completed"
  | "completed"
  | "failed";

export type QuestionStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "archived";

export type GenerationMode = "custom" | "preset";

export interface QuestionTypeOption {
  /** unique key used in request config counts, e.g. title:english:high */
  key: string;
  type: QuestionTypeCode;
  category: QuestionCategory;
  label: string;
  difficulty: DifficultyLevel;
  choiceLanguage: ChoiceLanguage;
  isObjective: boolean;
  preview: string;
  /** 아잉카 태그용 코드 (예: 요지추론) */
  aingkaCode?: string;
  /** 고정 한글 발문 */
  koreanStem?: string;
}

export interface QuestionTypeGroup {
  category: QuestionCategory;
  label: string;
  options: QuestionTypeOption[];
}

export interface GenerationRequestCounts {
  [optionKey: string]: number;
}

/** 생성 요청에 포함되는 개별 지문 */
export interface PassageInput {
  /** 클라이언트 임시 id (저장용) */
  clientId?: string;
  /** 지문별 제목 (비우면 공통 제목 + 번호) */
  title?: string;
  /** 지문별 출처 상세 (비우면 공통 sourceDetail) */
  sourceDetail?: string;
  text: string;
}

export interface GenerationRequestConfig {
  title: string;
  schoolName: string;
  grade: string;
  sourceType: string;
  sourceDetail: string;
  overallDifficulty: string;
  /** 단일 지문(하위 호환). passages가 있으면 무시될 수 있음 */
  passage: string;
  /** 다중 지문 (지문마다 동일 유형 세트 적용) */
  passages?: PassageInput[];
  /** 생성 시 저장된 지문 row id 목록 */
  passageIds?: string[];
  mode: GenerationMode;
  presetId: string | null;
  counts: GenerationRequestCounts;
  forceGenerateDespiteWarnings?: boolean;
}

export interface PassageAnalysis {
  overallTopic: string;
  overallMainIdea: string;
  titleCandidates: string[];
  paragraphRoles: Array<{ index: number; role: string; summary: string }>;
  sentenceFacts: Array<{ sentence: string; keyInfo: string }>;
  eventRelations: string[];
  causeEffect: string[];
  compareContrast: string[];
  timeOrder: string[];
  properNouns: string[];
  numbers: string[];
  keyVocabulary: string[];
  antonymCandidates: Array<{ word: string; antonym: string; reason: string }>;
  grammarPoints: Array<{ span: string; point: string }>;
  insertionClues: string[];
  orderClues: string[];
  blankCandidates: string[];
  writingCandidates: string[];
  estimatedDifficulty: string;
  unsuitableTypes: Array<{ type: QuestionTypeCode; reason: string }>;
  warnings: string[];
}

export interface GeneratedChoice {
  number: number;
  text: string;
}

export interface GeneratedEvidence {
  sentence: string;
  description: string;
}

export interface ScoringGuide {
  totalPoints: number;
  fullScoreCondition: string;
  partialScoreConditions: Array<{ points: number; condition: string }>;
  requiredKeywords?: string[];
  requiredGrammar?: string[];
}

export interface QuestionValidation {
  singleCorrectAnswer: boolean;
  answerMatchesExplanation: boolean;
  evidenceExists: boolean;
  ambiguityRisk: "low" | "medium" | "high";
  difficultyMatch: boolean;
  grammarChecked: boolean;
  overallScore: number;
  warnings: string[];
  typeMatch?: boolean;
}

export interface GeneratedQuestionPayload {
  type: QuestionTypeCode;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  choiceLanguage: ChoiceLanguage;
  passageOriginal: string;
  passageModified?: string;
  instruction: string;
  questionText: string;
  choices?: GeneratedChoice[];
  correctAnswer: string | number | number[];
  acceptableAnswers?: string[];
  explanation: string;
  /** 보기·지문에서 뽑은 고난도 단어 (해설지·단어학습) */
  hardWords?: Array<{ word: string; meaning: string }>;
  evidence: GeneratedEvidence[];
  scoringGuide?: ScoringGuide;
  validation?: QuestionValidation;
}

export interface PresetConfig {
  counts: GenerationRequestCounts;
}

export interface QuestionSetItem {
  questionId: string;
  orderIndex: number;
}
