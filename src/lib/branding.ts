import { academyConfig } from "@/config/academy";

export const SITE_NAME = academyConfig.lmsTitle;
export const LOGIN_TAGLINE = academyConfig.loginSubtitle;
export const SITE_DESCRIPTION = `${academyConfig.academyName} 전용 학습 관리 시스템`;
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? academyConfig.productionSiteUrl;

export const LOGO_SRC = academyConfig.logoPath;

/** SNS·카카오톡 미리보기용 절대 URL */
export const OG_IMAGE_URL = new URL(
  "/opengraph-image",
  SITE_URL
).toString();
export const ACADEMY_MOTTO = "올바르게, 깊이 있게 배웁니다.";
