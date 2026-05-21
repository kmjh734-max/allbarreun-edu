import { academyConfig } from "@/config/academy";

export const SITE_NAME = academyConfig.lmsTitle;
export const LOGIN_TAGLINE = academyConfig.loginSubtitle;
export const SITE_DESCRIPTION = `${academyConfig.academyName} 전용 학습 관리 시스템`;
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const LOGO_SRC = academyConfig.logoPath;
export const ACADEMY_MOTTO = "올바르게, 깊이 있게 배웁니다.";
