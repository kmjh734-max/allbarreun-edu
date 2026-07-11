import type { ReactNode } from "react";
import * as actions from "@/app/admin/vocab/actions";
import { renderVocabShell } from "@/lib/vocab/render-vocab-shell";

export default async function AdminVocabShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return renderVocabShell(
    "admin",
    "sets",
    "/admin/classes",
    children,
    {
      createVocabFolder: actions.createVocabFolder,
      deleteVocabFolder: actions.deleteVocabFolder,
    }
  );
}
