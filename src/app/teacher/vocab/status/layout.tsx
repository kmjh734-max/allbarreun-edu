import type { ReactNode } from "react";
import { renderVocabShell } from "@/lib/vocab/render-vocab-shell";

export default async function TeacherVocabStatusLayout({
  children,
}: {
  children: ReactNode;
}) {
  return renderVocabShell("teacher", "status", "/teacher/classes", children);
}
