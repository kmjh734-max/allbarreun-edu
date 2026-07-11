import type { SetTestResultRow } from "@/lib/vocab/load-set-test-results";

interface VocabTestResultsTableProps {
  rows: SetTestResultRow[];
}

export function VocabTestResultsTable({ rows }: VocabTestResultsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        아직 제출된 테스트 결과가 없습니다.
      </p>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>응시 학생</th>
            <th>테스트 유형</th>
            <th>점수</th>
            <th>정답</th>
            <th>제출일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium text-slate-900">{row.student_name}</td>
              <td>{row.test_type_label}</td>
              <td>{row.score}점</td>
              <td>
                {row.correct_count} / {row.total_questions}
              </td>
              <td className="whitespace-nowrap text-slate-600">
                {row.submitted_at
                  ? new Date(row.submitted_at).toLocaleString("ko-KR")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
