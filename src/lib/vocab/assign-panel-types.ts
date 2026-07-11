import type {
  AssignableStudent,
  ClassWithStudents,
  FolderAssignmentRow,
} from "@/components/vocab/VocabAssignmentPanel";

export interface VocabAssignPanelData {
  classes: ClassWithStudents[];
  allStudents: AssignableStudent[];
  assignments: FolderAssignmentRow[];
  setCount: number;
  setTitles: string[];
}
