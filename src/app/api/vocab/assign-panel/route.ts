import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import {
  loadFolderAssignPanelData,
  loadSetAssignPanelData,
} from "@/lib/vocab/load-assign-panel";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const setId = searchParams.get("setId");

  const supabase = await createClient();
  const role = profile.role as "admin" | "teacher";

  try {
    if (folderId) {
      const data = await loadFolderAssignPanelData(
        supabase,
        role,
        profile.id,
        folderId
      );
      return NextResponse.json(data);
    }

    if (setId) {
      const data = await loadSetAssignPanelData(
        supabase,
        role,
        profile.id,
        setId
      );
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "folderId or setId required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to load assign panel" }, { status: 500 });
  }
}
