import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { VocabCombinedSidebar } from "@/components/vocab/VocabCombinedSidebar";
import { VocabSidebarProvider } from "@/components/vocab/VocabSidebarContext";
import { loadVocabSidebarData } from "@/lib/vocab/load-sidebar";

const EMPTY_SIDEBAR = { classes: [], folders: [], sets: [] };

export async function renderVocabShell(
  role: "admin" | "teacher",
  mode: "status" | "assign" | "sets",
  classesHref: string,
  children: ReactNode,
  actions?: {
    createVocabFolder: (name: string) => Promise<{ ok: boolean; message: string }>;
    deleteVocabFolder: (
      folderId: string
    ) => Promise<{ ok: boolean; message: string }>;
  }
) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const sidebarData =
    mode === "status"
      ? EMPTY_SIDEBAR
      : await loadVocabSidebarData(supabase, role, profile!.id);

  return (
    <VocabSidebarProvider value={sidebarData}>
      <div className="-mx-4 flex min-h-[calc(100vh-7rem)] flex-col bg-slate-100/80 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm">
        <div className="flex flex-1 flex-col lg:flex-row">
          <VocabCombinedSidebar
            role={role}
            classesHref={classesHref}
            mode={mode}
            onCreateFolder={actions?.createVocabFolder}
            onDeleteFolder={actions?.deleteVocabFolder}
          />
          <main className="flex min-w-0 flex-1 flex-col bg-slate-50/50 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </VocabSidebarProvider>
  );
}
