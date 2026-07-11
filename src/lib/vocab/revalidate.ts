import { revalidatePath } from "next/cache";

export function revalidateVocabPaths(
  role: "admin" | "teacher",
  opts?: { folderId?: string; setId?: string; classId?: string }
) {
  const base = role === "admin" ? "/admin/vocab" : "/teacher/vocab";

  revalidatePath(base);
  revalidatePath(`${base}/sets`);
  revalidatePath(`${base}/assign`);
  revalidatePath(`${base}/status`);
  revalidatePath("/student/vocab");
  if (opts?.folderId) revalidatePath(`${base}/folder/${opts.folderId}`);
  if (opts?.setId) revalidatePath(`${base}/set/${opts.setId}`);
  if (opts?.classId) {
    revalidatePath(
      role === "admin"
        ? `/admin/classes/${opts.classId}`
        : `/teacher/classes/${opts.classId}`
    );
  }
}
