import type { Profile } from "@/types/database";

export interface StudentVocabProgressRow {
  student: Profile;
  known: number;
  review: number;
  studied: number;
  total: number;
}

interface TeacherVocabProgressTableProps {
  rows: StudentVocabProgressRow[];
}

export function TeacherVocabProgressTable({
  rows,
}: TeacherVocabProgressTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        배정된 학생이 없거나 학습 기록이 없습니다.
      </p>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>학생</th>
            <th>학습한 단어</th>
            <th>알아요</th>
            <th>복습 필요</th>
            <th>진행률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const percent =
              row.total > 0
                ? Math.round((row.known / row.total) * 100)
                : 0;
            return (
              <tr key={row.student.id}>
                <td className="font-medium">{row.student.name}</td>
                <td>{row.studied}</td>
                <td className="text-green-700">{row.known}</td>
                <td className="text-amber-700">{row.review}</td>
                <td>{percent}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
