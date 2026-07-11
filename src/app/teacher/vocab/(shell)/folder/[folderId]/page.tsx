import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { VocabFolderView } from "@/components/vocab/VocabFolderView";
import { loadVocabFolderPageData } from "@/lib/vocab/load-folder-page";

interface PageProps {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<{ openAssign?: string }>;
}

export default async function TeacherVocabFolderPage({
  params,
  searchParams,
}: PageProps) {
  const { folderId } = await params;
  const { openAssign } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const data = await loadVocabFolderPageData(
    supabase,
    "teacher",
    profile!.id,
    folderId
  );

  if (!data) notFound();

  const { folder, ...rest } = data;

  return (
    <VocabFolderView
      role="teacher"
      initialAssignOpen={openAssign === "1"}
      folderId={folder.id}
      folderName={folder.name}
      academyName={rest.academyName}
      ownerName={rest.ownerName}
      ownerUsername={rest.ownerUsername}
      sets={rest.sets}
      folders={rest.folderOptions}
    />
  );
}
