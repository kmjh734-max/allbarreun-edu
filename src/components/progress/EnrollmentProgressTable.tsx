import {
  formatLastStudiedDate,
  type EnrollmentProgressRow,
} from "@/lib/progress/enrollment-progress";

interface EnrollmentProgressTableProps {
  rows: EnrollmentProgressRow[];
  emptyMessage?: string;
}

export function EnrollmentProgressTable({
  rows,
  emptyMessage = "아직 수강 현황이 없습니다.",
}: EnrollmentProgressTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
              학생
            </th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
              이메일
            </th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
              강좌
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-700">
              전체 영상
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-slate-700">
              완료
            </th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
              진행률
            </th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
              마지막 학습일
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.studentId}-${row.courseId}`}
              className="border-b border-slate-100 last:border-0"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                {row.studentName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {row.studentEmail}
              </td>
              <td className="px-4 py-3 text-slate-800">{row.courseTitle}</td>
              <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                {row.totalLessons}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center text-slate-700">
                {row.completedLessons}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${row.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-brand-700">
                    {row.progressPercent}%
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatLastStudiedDate(row.lastStudiedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
