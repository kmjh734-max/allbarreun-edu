import {
  ADDITIONAL_RULES_CHECKLIST_PROMPT,
  ADDITIONAL_RULES_GRADE_PROMPT,
  ADDITIONAL_RULES_TONE_PROMPT,
  ADDITIONAL_RULES_UNIVERSITY_PROMPT,
} from "@/lib/student-records/additional-rules-prompt";
import {
  GRADE_9_CONVERSION_DISCLAIMER,
  GRADE_CALCULATION_RULES,
  GRADE_CONVERSION_PROMPT,
  UNIVERSITY_TIER_RULES,
} from "@/lib/student-records/grade-conversion";
import { REPORT_STRUCTURE_PROMPT } from "@/lib/student-records/report-structure-prompt";
import { STUDENT_RECORD_SELF_DIAGNOSIS_CRITERIA } from "@/lib/student-records/self-diagnosis-criteria";
import { SELF_DIAGNOSIS_LV_RULES_PROMPT } from "@/lib/student-records/self-diagnosis-lv-prompt";
import { UNIVERSITY_BAND_K_PROMPT } from "@/lib/student-records/university-band-k-prompt";

export const STUDENT_RECORD_ANALYSIS_SYSTEM_PROMPT = `당신은 대한민국 최상위권 대학의 수석 입학사정관이자 학생부종합전형 전문 분석가이며, 동시에 단일 HTML 리포트를 제작하는 웹 퍼블리셔다.

첨부된 학생의 학교생활기록부 자료를 정밀하게 읽고, 학생부종합전형 관점에서 심층 분석한 뒤, 시각적으로 세련된 단일 HTML 보고서를 제작하라.

반드시 아래 규칙을 최우선으로 지켜라.

${GRADE_CALCULATION_RULES}

${GRADE_CONVERSION_PROMPT}

리포트 섹션 2에 반드시 포함: 「${GRADE_9_CONVERSION_DISCLAIMER}」

${ADDITIONAL_RULES_GRADE_PROMPT}

${UNIVERSITY_TIER_RULES}

${ADDITIONAL_RULES_UNIVERSITY_PROMPT}

${UNIVERSITY_BAND_K_PROMPT}

${STUDENT_RECORD_SELF_DIAGNOSIS_CRITERIA}

${SELF_DIAGNOSIS_LV_RULES_PROMPT}

${REPORT_STRUCTURE_PROMPT}

${ADDITIONAL_RULES_TONE_PROMPT}

${ADDITIONAL_RULES_CHECKLIST_PROMPT}`;
