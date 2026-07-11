import { createAdminClient } from "@/lib/supabase/admin";
import { analyzePassage } from "@/lib/question-generator/analyze-passage";
import {
  GENERATION_CONCURRENCY,
  MAX_REGENERATION_ATTEMPTS,
  MAX_SETS_PER_TYPE,
  MIN_SENTENCES_FOR_INSERTION_IRRELEVANT,
} from "@/lib/question-generator/constants";
import { syncExamVocabSetFromJob, diversifyJobHardWords } from "@/lib/question-generator/exam-vocab";
import { generateOneQuestion, SkipQuestionError } from "@/lib/question-generator/generate-question";
import { resolvePassages } from "@/lib/question-generator/passages";
import {
  expandCountRequests,
  findOptionByKey,
  sanitizeCounts,
} from "@/lib/question-generator/question-types";
import {
  shouldRegenerate,
  validateGeneratedQuestion,
} from "@/lib/question-generator/validate-question";
import { countEnglishSentences } from "@/lib/question-generator/text-utils";
import type {
  GenerationRequestConfig,
  GeneratedQuestionPayload,
  PassageAnalysis,
  QuestionTypeOption,
} from "@/lib/question-generator/types";

async function updateJob(
  jobId: string,
  patch: Record<string, unknown>
) {
  const admin = createAdminClient();
  await admin.from("question_generation_jobs").update(patch).eq("id", jobId);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function toRow(
  payload: GeneratedQuestionPayload,
  opts: {
    passageId: string;
    jobId: string;
    option: QuestionTypeOption;
    userId: string;
    attempt: number;
    status: string;
    validationScore: number | null;
    errorMessage?: string | null;
  }
) {
  const approved = opts.status === "approved";
  return {
    passage_id: opts.passageId,
    generation_job_id: opts.jobId,
    option_key: opts.option.key,
    category: payload.category,
    question_type: payload.type,
    difficulty: payload.difficulty,
    choice_language: payload.choiceLanguage,
    passage_original: payload.passageOriginal,
    passage_modified: payload.passageModified ?? null,
    instruction: payload.instruction,
    question_text: payload.questionText,
    choices: payload.choices ?? null,
    correct_answer: payload.correctAnswer,
    acceptable_answers: payload.acceptableAnswers ?? null,
    explanation: payload.explanation,
    hard_words: payload.hardWords ?? [],
    evidence: payload.evidence ?? [],
    scoring_guide: payload.scoringGuide ?? null,
    validation_result: payload.validation ?? null,
    validation_score: opts.validationScore,
    status: opts.status,
    generation_attempt: opts.attempt,
    error_message: opts.errorMessage ?? null,
    created_by: opts.userId,
    approved_by: approved ? opts.userId : null,
    approved_at: approved ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function generateWithValidation(opts: {
  passage: string;
  analysis: PassageAnalysis;
  option: QuestionTypeOption;
  grade: string;
  overallDifficulty: string;
  sourceDetail?: string;
  diversitySlot?: { index: number; total: number; label: string };
}): Promise<{
  payload: GeneratedQuestionPayload | null;
  status: "approved";
  attempt: number;
  error: string | null;
  skipped?: boolean;
}> {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_REGENERATION_ATTEMPTS + 1; attempt++) {
    try {
      const payload = await generateOneQuestion(opts);
      const validation = validateGeneratedQuestion({
        passage: opts.passage,
        option: opts.option,
        question: payload,
      });
      payload.validation = validation;

      if (!shouldRegenerate(validation)) {
        return { payload, status: "approved", attempt, error: null };
      }
      lastError = validation.warnings.join(" · ") || "형태 검수 미달";
    } catch (e) {
      if (e instanceof SkipQuestionError) {
        return {
          payload: null,
          status: "approved",
          attempt,
          error: e.message,
          skipped: true,
        };
      }
      lastError = e instanceof Error ? e.message : "생성 실패";
    }
  }

  // 미달·실패 문항은 저장하지 않고 폐기
  return {
    payload: null,
    status: "approved",
    attempt: MAX_REGENERATION_ATTEMPTS + 1,
    error: lastError ?? "생성 실패 — 문항 폐기",
  };
}

type WorkItem = {
  passageId: string;
  passageText: string;
  analysis: PassageAnalysis;
  option: QuestionTypeOption;
  sourceDetail?: string;
  label: string;
  diversitySlot: { index: number; total: number; label: string };
};

/**
 * Long-running job processor. Safe to call once; ignores if already running/done.
 */
export async function runGenerationJob(jobId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("question_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) throw new Error("생성 작업을 찾을 수 없습니다.");
  // pending / failed 만 시작. 진행 중·완료는 중복 실행 방지.
  if (job.status !== "pending" && job.status !== "failed") {
    return;
  }

  // 재시도 시 이전 문항 제거 후 다시 생성 (중복 방지)
  await admin
    .from("generated_english_questions")
    .delete()
    .eq("generation_job_id", jobId);

  const config = job.request_config as GenerationRequestConfig;
  config.counts = sanitizeCounts(config.counts, MAX_SETS_PER_TYPE);
  const userId = job.created_by as string;

  const passageIds =
    Array.isArray(config.passageIds) && config.passageIds.length > 0
      ? config.passageIds
      : [job.passage_id as string];

  const resolved = resolvePassages(config);

  try {
    await updateJob(jobId, {
      status: "analyzing",
      progress_message: `지문 분석 중 (0/${passageIds.length})`,
      error_message: null,
    });

    const options = expandCountRequests(config.counts ?? {});
    const work: WorkItem[] = [];

    for (let pi = 0; pi < passageIds.length; pi++) {
      const passageId = passageIds[pi]!;
      const { data: passageRow } = await admin
        .from("english_source_passages")
        .select("*")
        .eq("id", passageId)
        .single();

      if (!passageRow) {
        await updateJob(jobId, {
          status: "failed",
          error_message: `지문 ${pi + 1}을(를) 찾을 수 없습니다.`,
          completed_at: new Date().toISOString(),
        });
        return;
      }

      await updateJob(jobId, {
        status: "analyzing",
        progress_message: `지문 분석 중 (${pi + 1}/${passageIds.length})`,
      });

      let analysis = passageRow.analysis as PassageAnalysis | null;
      if (!analysis) {
        analysis = await analyzePassage({
          passage: passageRow.passage,
          grade: passageRow.grade,
          overallDifficulty: passageRow.overall_difficulty,
        });
        await admin
          .from("english_source_passages")
          .update({
            analysis,
            updated_at: new Date().toISOString(),
          })
          .eq("id", passageId);
      }

      const meta = resolved[pi];
      const sourceDetail =
        meta?.sourceDetail ||
        config.sourceDetail ||
        passageRow.source_detail ||
        undefined;

      for (const option of options) {
        work.push({
          passageId,
          passageText: passageRow.passage,
          analysis,
          option,
          sourceDetail,
          label:
            passageIds.length > 1
              ? `지문${pi + 1} · ${option.label}`
              : option.label,
          diversitySlot: {
            index: 0,
            total: 0,
            label: option.label,
          },
        });
      }
    }

    // 지문별로 슬롯 번호 부여 (동의어·보기단어 다양화 힌트)
    const slotByPassage = new Map<string, number>();
    const totalByPassage = new Map<string, number>();
    for (const item of work) {
      totalByPassage.set(
        item.passageId,
        (totalByPassage.get(item.passageId) ?? 0) + 1
      );
    }
    for (const item of work) {
      const idx = slotByPassage.get(item.passageId) ?? 0;
      slotByPassage.set(item.passageId, idx + 1);
      item.diversitySlot = {
        index: idx,
        total: totalByPassage.get(item.passageId) ?? 1,
        label: item.label,
      };
    }

    await updateJob(jobId, {
      status: "generating",
      progress_message: `문제 생성 중 (0/${work.length})`,
      total_requested: work.length,
      total_completed: 0,
      total_failed: 0,
    });

    let completed = 0;
    let failed = 0;
    let skipped = 0;

    await mapPool(work, GENERATION_CONCURRENCY, async (item) => {
      await updateJob(jobId, {
        progress_message: `${item.label} 생성 중 (${completed + failed + skipped}/${work.length})`,
        status: "generating",
      });

      // 문장삽입·무관한문장: 문장 5개 이하면 AI 호출 없이 생략
      if (
        (item.option.type === "sentence_insertion" ||
          item.option.type === "irrelevant_sentence") &&
        countEnglishSentences(item.passageText) <
          MIN_SENTENCES_FOR_INSERTION_IRRELEVANT
      ) {
        skipped += 1;
        await updateJob(jobId, {
          total_completed: completed,
          total_failed: failed,
          progress_message: `${completed + failed + skipped}/${work.length} 완료${
            skipped > 0 ? ` (생략 ${skipped})` : ""
          }`,
        });
        return;
      }

      const result = await generateWithValidation({
        passage: item.passageText,
        analysis: item.analysis,
        option: item.option,
        grade: config.grade || "고1",
        overallDifficulty: config.overallDifficulty || "기본",
        sourceDetail: item.sourceDetail,
        diversitySlot: item.diversitySlot,
      });

      if (result.skipped) {
        skipped += 1;
      } else if (!result.payload) {
        failed += 1;
      } else {
        completed += 1;
        await admin.from("generated_english_questions").insert(
          toRow(result.payload, {
            passageId: item.passageId,
            jobId,
            option: item.option,
            userId,
            attempt: result.attempt,
            status: "approved",
            validationScore: result.payload.validation?.overallScore ?? null,
            errorMessage: null,
          })
        );
      }

      await updateJob(jobId, {
        total_completed: completed,
        total_failed: failed,
        progress_message: `${completed + failed + skipped}/${work.length} 완료${
          skipped > 0 ? ` (생략 ${skipped})` : ""
        }`,
      });
    });

    const finalStatus =
      failed > 0 && completed > 0
        ? "partially_completed"
        : failed > 0 && completed === 0
          ? "failed"
          : "completed";

    await updateJob(jobId, {
      status: finalStatus,
      progress_message:
        finalStatus === "completed"
          ? skipped > 0
            ? `생성 완료 (생략 ${skipped})`
            : "생성 완료"
          : finalStatus === "partially_completed"
            ? "일부 문항 생성 완료"
            : "생성 실패",
      error_message:
        finalStatus === "failed" ? "선택한 유형 생성에 실패했습니다." : null,
      completed_at: new Date().toISOString(),
      total_completed: completed,
      total_failed: failed,
    });

    if (completed > 0) {
      try {
        await diversifyJobHardWords(jobId);
      } catch (e) {
        console.error("hard words diversify failed", e);
      }
      try {
        await syncExamVocabSetFromJob(jobId);
      } catch (e) {
        console.error("exam vocab sync failed", e);
      }
    }
  } catch (e) {
    await updateJob(jobId, {
      status: "failed",
      error_message: e instanceof Error ? e.message : "생성 작업 실패",
      completed_at: new Date().toISOString(),
    });
  }
}

export async function regenerateSingleQuestion(opts: {
  questionId: string;
  mode: "full" | "choices";
}): Promise<void> {
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("generated_english_questions")
    .select("*")
    .eq("id", opts.questionId)
    .single();

  if (!q) throw new Error("문제를 찾을 수 없습니다.");

  const { data: passageRow } = await admin
    .from("english_source_passages")
    .select("passage, grade, overall_difficulty, analysis, source_detail")
    .eq("id", q.passage_id)
    .single();

  if (!passageRow) throw new Error("지문을 찾을 수 없습니다.");

  const option = findOptionByKey(q.option_key ?? "") ?? {
    key: q.option_key ?? `${q.question_type}:na:default`,
    type: q.question_type,
    category: q.category,
    label: q.question_type,
    difficulty: q.difficulty,
    choiceLanguage: q.choice_language,
    isObjective: true,
    preview: "",
  };

  let analysis = passageRow.analysis as PassageAnalysis | null;
  if (!analysis) {
    analysis = await analyzePassage({
      passage: passageRow.passage,
      grade: passageRow.grade,
      overallDifficulty: passageRow.overall_difficulty,
    });
  }

  const result = await generateWithValidation({
    passage: passageRow.passage,
    analysis,
    option: option as QuestionTypeOption,
    grade: passageRow.grade,
    overallDifficulty: passageRow.overall_difficulty,
    sourceDetail: passageRow.source_detail || undefined,
  });

  if (!result.payload) {
    throw new Error(result.error ?? "재생성에 실패했습니다. 문항을 삭제하세요.");
  }

  const before = { ...q };
  const patch: Record<string, unknown> = {
    instruction: result.payload.instruction,
    question_text: result.payload.questionText,
    passage_modified: result.payload.passageModified ?? null,
    choices: result.payload.choices ?? null,
    correct_answer: result.payload.correctAnswer,
    acceptable_answers: result.payload.acceptableAnswers ?? null,
    explanation: result.payload.explanation,
    evidence: [],
    scoring_guide: result.payload.scoringGuide ?? null,
    validation_result: result.payload.validation ?? null,
    validation_score: result.payload.validation?.overallScore ?? null,
    status: "approved",
    generation_attempt: (q.generation_attempt ?? 1) + 1,
    error_message: null,
    approved_by: q.created_by,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (opts.mode === "choices") {
    // keep instruction/question stem if possible; still overwrite choices/answer/explanation
    delete patch.instruction;
    delete patch.question_text;
    delete patch.passage_modified;
  }

  await admin
    .from("generated_english_questions")
    .update(patch)
    .eq("id", opts.questionId);

  await admin.from("question_edit_history").insert({
    question_id: opts.questionId,
    before_data: before,
    after_data: patch,
    edited_by: q.created_by,
  });
}
