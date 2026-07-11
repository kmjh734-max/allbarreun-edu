import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Class, VocabFolder } from "@/types/database";
import type { VocabSidebarSet } from "@/components/vocab/vocab-sidebar-types";
import { fetchVocabItemCountsBySetIds } from "@/lib/vocab/vocab-item-counts";

export const loadVocabSidebarData = cache(async function loadVocabSidebarData(
  supabase: SupabaseClient,
  role: "admin" | "teacher",
  userId: string
): Promise<{
  classes: Class[];
  folders: VocabFolder[];
  sets: VocabSidebarSet[];
}> {
  const classesQuery =
    role === "admin"
      ? supabase
          .from("classes")
          .select("id, name")
          .eq("is_active", true)
          .order("name")
      : supabase
          .from("classes")
          .select("id, name")
          .eq("teacher_id", userId)
          .eq("is_active", true)
          .order("name");

  const foldersQuery =
    role === "admin"
      ? supabase.from("vocab_folders").select("id, name, created_at").order("name")
      : supabase
          .from("vocab_folders")
          .select("id, name, created_at")
          .or(`teacher_id.eq.${userId},created_by.eq.${userId}`)
          .order("name");

  const setsQuery =
    role === "admin"
      ? supabase
          .from("vocab_sets")
          .select("id, title, folder_id")
          .order("created_at", { ascending: false })
      : supabase
          .from("vocab_sets")
          .select("id, title, folder_id")
          .or(`teacher_id.eq.${userId},created_by.eq.${userId}`)
          .order("created_at", { ascending: false });

  const [classesRes, foldersRes, setsRes] = await Promise.all([
    classesQuery,
    foldersQuery,
    setsQuery,
  ]);

  const setList = setsRes.data ?? [];
  const itemCountBySet = await fetchVocabItemCountsBySetIds(
    supabase,
    setList.map((s) => s.id as string)
  );

  const sets = setList.map((s) => ({
    id: s.id as string,
    title: s.title as string,
    folder_id: (s.folder_id as string | null) ?? null,
    item_count: itemCountBySet.get(s.id as string) ?? 0,
  }));

  return {
    classes: (classesRes.data ?? []) as Class[],
    folders: (foldersRes.data ?? []) as VocabFolder[],
    sets,
  };
});
