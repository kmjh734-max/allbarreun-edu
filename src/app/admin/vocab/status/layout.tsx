import type { ReactNode } from "react";
import { renderVocabShell } from "@/lib/vocab/render-vocab-shell";

export default async function AdminVocabStatusLayout({
  children,
}: {
  children: ReactNode;
}) {
  return renderVocabShell("admin", "status", "/admin/classes", children);
}
