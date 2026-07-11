import type { VocabItem, VocabProgress, VocabProgressStatus } from "@/types/database";

export interface VocabSetStats {
  itemCount: number;
  knownCount: number;
  reviewCount: number;
  unknownCount: number;
  completionPercent: number;
}

export function computeVocabSetStats(
  items: Pick<VocabItem, "id">[],
  progress: Pick<VocabProgress, "item_id" | "status">[]
): VocabSetStats {
  const itemCount = items.length;
  const progressByItem = new Map(
    progress.map((p) => [p.item_id, p.status as VocabProgressStatus])
  );

  let knownCount = 0;
  let reviewCount = 0;

  for (const item of items) {
    const status = progressByItem.get(item.id) ?? "unknown";
    if (status === "known") knownCount += 1;
    else if (status === "review") reviewCount += 1;
  }

  const unknownCount = itemCount - knownCount - reviewCount;
  const completionPercent =
    itemCount > 0 ? Math.round((knownCount / itemCount) * 100) : 0;

  return {
    itemCount,
    knownCount,
    reviewCount,
    unknownCount,
    completionPercent,
  };
}

export function computeStudentProgressSummary(
  progress: Pick<VocabProgress, "student_id" | "status">[],
  studentId: string
): { known: number; review: number; studied: number } {
  const mine = progress.filter((p) => p.student_id === studentId);
  return {
    known: mine.filter((p) => p.status === "known").length,
    review: mine.filter((p) => p.status === "review").length,
    studied: mine.length,
  };
}
