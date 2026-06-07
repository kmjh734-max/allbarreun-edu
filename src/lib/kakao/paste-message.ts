import { academyConfig } from "@/config/academy";

/** 카카오톡 채팅에 직접 붙여넣기 — URL이 일반 하이퍼링크로 인식됨 */
export function buildKakaoPasteMessage(params: {
  studentName: string;
  periodLabel: string;
  shareUrl: string;
}): string {
  const { studentName, periodLabel, shareUrl } = params;
  return `[${academyConfig.academyName}] ${studentName} 학생 학습 리포트

${periodLabel} 온라인 학습 현황 리포트입니다.

아래 링크에서 확인해 주세요.
${shareUrl}`;
}
