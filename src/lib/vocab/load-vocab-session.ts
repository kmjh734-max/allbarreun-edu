import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFinalExamQuestions,
  buildLearningQueue,
  buildLearningSteps,
  type FinalExamQuestion,
  type LearningStep,
} from "@/lib/vocab/session-queue";
import type { VocabItem, VocabProgressStatus } from "@/types/database";

export type VocabSessionPhase = "learning" | "final" | "completed";

export interface VocabSessionState {
  rounds_completed: number;
  phase: VocabSessionPhase;
  final_attempt_id: string | null;
}

export interface VocabSessionPayload {
  setId: string;
  setTitle: string;
  items: VocabItem[];
  session: VocabSessionState;
  learningQueue: string[];
  learningSteps: LearningStep[];
  finalQuestions: FinalExamQuestion[];
  knownCount: number;
  totalCount: number;
}

export async function loadVocabSession(
  supabase: SupabaseClient,
  studentId: string,
  setId: string,
  setTitle: string
): Promise<VocabSessionPayload | null> {
  const [{ data: items }, { data: progress }, { data: sessionRow }] =
    await Promise.all([
      supabase
        .from("vocab_items")
        .select("*")
        .eq("set_id", setId)
        .order("order_index")
        .order("created_at"),
      supabase
        .from("vocab_progress")
        .select("item_id, status")
        .eq("student_id", studentId),
      supabase
        .from("vocab_set_sessions")
        .select("*")
        .eq("student_id", studentId)
        .eq("set_id", setId)
        .maybeSingle(),
    ]);

  const itemList = (items ?? []) as VocabItem[];
  if (itemList.length < 1) return null;

  const statusByItem = new Map<string, VocabProgressStatus>();
  for (const p of progress ?? []) {
    statusByItem.set(p.item_id, p.status as VocabProgressStatus);
  }

  let session: VocabSessionState = sessionRow
    ? {
        rounds_completed: sessionRow.rounds_completed as number,
        phase: sessionRow.phase as VocabSessionPhase,
        final_attempt_id: sessionRow.final_attempt_id as string | null,
      }
    : { rounds_completed: 0, phase: "learning", final_attempt_id: null };

  const learningQueue = buildLearningQueue(itemList, statusByItem);

  if (learningQueue.length === 0 && session.phase === "learning") {
    session = { ...session, phase: "final" };
    await upsertVocabSession(supabase, studentId, setId, { phase: "final" });
  }

  const knownCount = itemList.filter(
    (i) => statusByItem.get(i.id) === "known"
  ).length;

  return {
    setId,
    setTitle,
    items: itemList,
    session,
    learningQueue,
    learningSteps: buildLearningSteps(itemList, learningQueue),
    finalQuestions: buildFinalExamQuestions(itemList),
    knownCount,
    totalCount: itemList.length,
  };
}

export async function upsertVocabSession(
  supabase: SupabaseClient,
  studentId: string,
  setId: string,
  patch: Partial<VocabSessionState>
): Promise<VocabSessionState> {
  const { data: existing } = await supabase
    .from("vocab_set_sessions")
    .select("*")
    .eq("student_id", studentId)
    .eq("set_id", setId)
    .maybeSingle();

  const merged: VocabSessionState = {
    rounds_completed:
      patch.rounds_completed ??
      (existing?.rounds_completed as number) ??
      0,
    phase:
      patch.phase ?? (existing?.phase as VocabSessionPhase) ?? "learning",
    final_attempt_id:
      patch.final_attempt_id !== undefined
        ? patch.final_attempt_id
        : ((existing?.final_attempt_id as string | null) ?? null),
  };

  const { error } = await supabase.from("vocab_set_sessions").upsert({
    student_id: studentId,
    set_id: setId,
    rounds_completed: merged.rounds_completed,
    phase: merged.phase,
    final_attempt_id: merged.final_attempt_id,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return merged;
}
