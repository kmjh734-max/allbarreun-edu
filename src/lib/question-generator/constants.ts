/** 유형별 최대 세트 수 */
export const MAX_SETS_PER_TYPE = 50;

/** 한 번에 생성 가능한 최대 문항 수 (지문 수 × 유형 합) */
export const MAX_TOTAL_QUESTIONS = 500;

/** 한 번에 넣을 수 있는 최대 지문 수 */
export const MAX_PASSAGES = 30;

/** 로컬 검수 통과 최소 점수 (미달 시 문항 폐기) */
export const VALIDATION_PASS_SCORE = 70;

/** 문항당 최대 재생성 횟수 (요약문 오생성 등 1회 재시도) */
export const MAX_REGENERATION_ATTEMPTS = 1;

/** AI 동시 요청 수 */
export const GENERATION_CONCURRENCY = 6;

/** 지문 최소 단어 수 (경고) */
export const MIN_PASSAGE_WORDS = 40;

/** 지문 최소 문장 수 (순서/삽입 등 경고) */
export const MIN_PASSAGE_SENTENCES_FOR_ORDER = 4;

/** 문장삽입·무관한문장: 문장 수가 이 값 이하이면 생성 생략 (5개 초과 필요) */
export const MIN_SENTENCES_FOR_INSERTION_IRRELEVANT = 6;

export const GRADES = [
  { value: "중1", label: "중1" },
  { value: "중2", label: "중2" },
  { value: "중3", label: "중3" },
  { value: "고1", label: "고1" },
  { value: "고2", label: "고2" },
  { value: "고3", label: "고3" },
] as const;

export const SOURCE_TYPES = [
  { value: "교과서", label: "교과서" },
  { value: "부교재", label: "부교재" },
  { value: "모의고사", label: "모의고사" },
  { value: "자체 지문", label: "자체 지문" },
  { value: "기타", label: "기타" },
] as const;

export const OVERALL_DIFFICULTIES = [
  { value: "기본", label: "기본" },
  { value: "내신", label: "내신" },
  { value: "고난도", label: "고난도" },
] as const;

export type GradeValue = (typeof GRADES)[number]["value"];
export type SourceTypeValue = (typeof SOURCE_TYPES)[number]["value"];
export type OverallDifficultyValue =
  (typeof OVERALL_DIFFICULTIES)[number]["value"];
