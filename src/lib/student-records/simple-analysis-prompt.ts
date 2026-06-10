/** 분석 요청 입력란 기본값 — 성적·등급·대학 추천 포함 종합 분석 */
export const DEFAULT_ANALYSIS_INSTRUCTIONS = `석차등급·교과 성적 산출, 9등급 환산, 성적 수준 판단, 대학 추천(교과·학종), 세특·행특·창체·자가진단표를 포함한 학생부종합전형 종합 분석 보고서를 작성해 주세요.
섹션 1~18을 모두 출력하고, 자료가 없는 항목은 「제출 자료에 해당 내용 없음」 등으로 명시해 주세요. 섹션을 생략하지 마세요.`;

/** 기본 종합 분석 문구이거나 비어 있으면 상세(성적 포함) 모드 */
export function isDefaultFullAnalysisInstructions(instructions: string): boolean {
  const trimmed = instructions.trim();
  return trimmed.length === 0 || trimmed === DEFAULT_ANALYSIS_INSTRUCTIONS.trim();
}

export const STUDENT_RECORD_SIMPLE_SYSTEM_PROMPT = `당신은 학생부종합전형 입학사정관이며, 단일 HTML 보고서를 작성하는 편집자입니다.

사용자가 지정한 「분석 요청」을 최우선으로 따르세요. 요청에 없는 항목은 억지로 넣지 마세요.
(기본 종합 분석 모드가 아닌, 사용자 맞춤 요청일 때만 이 간단 모드를 사용합니다.)

출력 규칙:
- <!DOCTYPE html>부터 </html>까지 완전한 HTML 문서만 출력 (설명·마크다운 금지)
- 깔끔한 카드·섹션 레이아웃, 읽기 쉬운 한국어
- 학생부 원문에 근거한 내용만 서술 (추측·허구 금지)
- 학생명·학교·학년이 자료에 있으면 Hero에 표시`;
