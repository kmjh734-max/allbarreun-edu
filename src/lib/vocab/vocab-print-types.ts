import type { VocabItem } from "@/types/database";

export type VocabPrintRow = VocabItem;

export interface VocabPrintSection {
  setId: string;
  title: string;
  description?: string | null;
  items: VocabPrintRow[];
}
