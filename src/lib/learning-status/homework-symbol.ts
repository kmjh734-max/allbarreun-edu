import type { HomeworkDaySymbol } from "@/lib/learning-status/types";

export function homeworkSymbolChar(symbol: HomeworkDaySymbol): string {
  switch (symbol) {
    case "complete":
      return "○";
    case "partial":
      return "△";
    case "missing":
      return "X";
    case "scheduled":
    case "none":
    default:
      return "";
  }
}

export function homeworkSymbolTitle(
  symbol: HomeworkDaySymbol,
  completedCount: number,
  totalCount: number
): string {
  switch (symbol) {
    case "complete":
      return `완료 (${completedCount}/${totalCount})`;
    case "partial":
      return `일부 완료 (${completedCount}/${totalCount})`;
    case "missing":
      return "미완료";
    case "scheduled":
      return "예정";
    case "none":
    default:
      return "과제 없음";
  }
}
