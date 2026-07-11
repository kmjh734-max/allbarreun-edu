/**
 * 학원별 브랜드·인증 설정 — 새 학원 복제 시 이 파일만 수정하세요.
 */
export const ACADEMY_ID = "allbarreun" as const;

export const academyConfig = {
  academyName: "올바른교육",
  lmsTitle: "올바른교육 LMS",
  loginSubtitle: "올바른교육 온라인 학습관에 오신 것을 환영합니다.",
  internalEmailDomain: "allbarreun-edu-lms.local",
  logoPath: "/image/logo.png",
  /** 카카오톡·SNS 미리보기 (og:image) — Vercel 배포 URL과 맞출 것 */
  productionSiteUrl: "https://allbarreun-edu.vercel.app",
  /** 대표 색상 (Tailwind brand 팔레트 600과 맞춤) */
  primaryColor: "#E30613",
} as const;

export type AcademyConfig = typeof academyConfig;
