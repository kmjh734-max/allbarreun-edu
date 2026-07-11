"use client";

import { useState } from "react";
import { VocabSetCreateModal } from "@/components/vocab/VocabSetCreateModal";
import type { Profile } from "@/types/database";

interface VocabSetCreateLauncherProps {
  role: "admin" | "teacher";
  folderId?: string | null;
  folders?: { id: string; name: string }[];
  teachers?: Profile[];
  basePath: "/admin/vocab" | "/teacher/vocab";
  label?: string;
  onCreate: (input: {
    title: string;
    description?: string;
    teacherId?: string;
    folderId?: string | null;
  }) => Promise<{ ok: boolean; message: string; setId?: string }>;
}

export function VocabSetCreateLauncher({
  role,
  folderId,
  folders,
  teachers,
  basePath,
  label = "+ 단어세트 만들기",
  onCreate,
}: VocabSetCreateLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-[#7cb518] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#6aa014]"
      >
        {label}
      </button>
      <VocabSetCreateModal
        open={open}
        onClose={() => setOpen(false)}
        role={role}
        folderId={folderId}
        folders={folders}
        teachers={teachers}
        basePath={basePath}
        onCreate={onCreate}
      />
    </>
  );
}
