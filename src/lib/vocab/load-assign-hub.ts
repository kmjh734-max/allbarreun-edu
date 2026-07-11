import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchVocabItemCountsBySetIds } from "@/lib/vocab/vocab-item-counts";

export interface VocabAssignFolderItem {
  id: string;
  name: string;
  setCount: number;
}

export interface VocabAssignSetItem {
  id: string;
  title: string;
  folderId: string | null;
  folderName: string | null;
  itemCount: number;
}

export async function loadVocabAssignHubData(
  supabase: SupabaseClient,
  role: "admin" | "teacher",
  userId: string
): Promise<{
  folders: VocabAssignFolderItem[];
  unfiledSets: VocabAssignSetItem[];
}> {
  const foldersQuery =
    role === "admin"
      ? supabase.from("vocab_folders").select("id, name").order("name")
      : supabase
          .from("vocab_folders")
          .select("id, name")
          .or(`teacher_id.eq.${userId},created_by.eq.${userId}`)
          .order("name");

  const setsQuery =
    role === "admin"
      ? supabase
          .from("vocab_sets")
          .select("id, title, folder_id, folder:vocab_folders(name)")
          .order("created_at", { ascending: false })
      : supabase
          .from("vocab_sets")
          .select("id, title, folder_id, folder:vocab_folders(name)")
          .or(`teacher_id.eq.${userId},created_by.eq.${userId}`)
          .order("created_at", { ascending: false });

  const [{ data: folders }, { data: sets }] = await Promise.all([
    foldersQuery,
    setsQuery,
  ]);

  const setList = sets ?? [];
  const itemCountBySet = await fetchVocabItemCountsBySetIds(
    supabase,
    setList.map((s) => s.id as string)
  );

  const setCountByFolder = new Map<string, number>();
  const unfiledSets: VocabAssignSetItem[] = [];

  for (const row of setList) {
    const folderId = row.folder_id as string | null;
    if (folderId) {
      setCountByFolder.set(folderId, (setCountByFolder.get(folderId) ?? 0) + 1);
    } else {
      unfiledSets.push({
        id: row.id as string,
        title: row.title as string,
        folderId: null,
        folderName: null,
        itemCount: itemCountBySet.get(row.id as string) ?? 0,
      });
    }
  }

  const folderItems: VocabAssignFolderItem[] = (folders ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    setCount: setCountByFolder.get(f.id as string) ?? 0,
  }));

  return { folders: folderItems, unfiledSets };
}
