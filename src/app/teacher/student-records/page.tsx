import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { StudentRecordWorkspace } from "@/components/student-records/StudentRecordWorkspace";
import { listReportClasses, listReportStudents } from "@/lib/reports/list-students";

export default async function TeacherStudentRecordsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [classes, students] = await Promise.all([
    listReportClasses(supabase, "teacher", profile!.id),
    listReportStudents(supabase, "teacher", profile!.id, {}),
  ]);

  return (
    <StudentRecordWorkspace initialClasses={classes} initialStudents={students} />
  );
}
