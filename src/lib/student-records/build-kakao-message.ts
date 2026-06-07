import { academyConfig } from "@/config/academy";

export function buildStudentRecordKakaoMessage(params: {
  studentName: string;
  shareUrl?: string;
}): string {
  const date = new Date().toLocaleDateString("ko-KR");
  const lines = [
    `[${academyConfig.academyName}] 학생부 분석 리포트`,
    "",
    `${params.studentName} 학생 학교생활기록부 분석 보고서입니다.`,
    `${date} 기준 입학사정관 관점 종합 분석입니다.`,
  ];

  if (params.shareUrl?.trim()) {
    lines.push("", "아래 링크에서 확인해 주세요.", params.shareUrl.trim());
  } else {
    lines.push("", "첨부 PDF 또는 화면 캡처를 확인해 주세요.");
  }

  lines.push("", "자세한 상담이 필요하시면 학원으로 연락 부탁드립니다.");
  return lines.join("\n");
}
