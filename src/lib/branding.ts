import { academyConfig } from "@/config/academy";

export const SITE_NAME = academyConfig.lmsTitle;
export const LOGIN_TAGLINE = academyConfig.loginSubtitle;
export const SITE_DESCRIPTION = `${academyConfig.academyName} 전용 학습 관리 시스템`;
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const LOGO_SRC = academyConfig.logoPath;
/** 원장님 소개 이미지 (로그인 화면, 흰 배경) */
export const DIRECTOR_IMAGE_SRC = "/image/director-white.png";
export const DIRECTOR_CAPTION = `- ${academyConfig.academyName} -`;
export const ACADEMY_MOTTO = "올바르게, 깊이 있게 배웁니다.";
