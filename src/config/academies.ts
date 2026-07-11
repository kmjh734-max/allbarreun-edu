export type AcademyId = "jeongsu" | "iroom" | "allbarreun";

export type AcademyPreset = {
  academyName: string;
  lmsTitle: string;
  loginSubtitle: string;
  internalEmailDomain: string;
  logoPath: string;
  productionSiteUrl: string;
  primaryColor: string;
  motto?: string;
  directorImagePath?: string;
  directorCaption?: string;
};

export const ACADEMY_PRESETS: Record<AcademyId, AcademyPreset> = {
  jeongsu: {
    academyName: "정수학원",
    lmsTitle: "정수학원 LMS",
    loginSubtitle: "정수학원 온라인 학습관에 오신 것을 환영합니다.",
    internalEmailDomain: "jslms.local",
    logoPath: "/image/logo-jeongsu.png",
    productionSiteUrl: "https://jeongsu-lms.vercel.app",
    primaryColor: "#2563EB",
    motto: "정확하게, 깊이 있게 배웁니다.",
  },
  iroom: {
    academyName: "이룸학원",
    lmsTitle: "이룸학원 LMS",
    loginSubtitle: "이룸학원 온라인 학습관에 오신 것을 환영합니다.",
    internalEmailDomain: "jslms.local",
    logoPath: "/image/logo-iroom.png",
    productionSiteUrl: "https://iroom-edu-app.vercel.app",
    primaryColor: "#2563EB",
    motto: "아는 것은 더 철저하고 완벽하게 더 깊이있게!",
    directorImagePath: "/image/director.png",
    directorCaption: "- 이룸교육 대표 박우용 -",
  },
  allbarreun: {
    academyName: "올바른교육",
    lmsTitle: "올바른교육 LMS",
    loginSubtitle: "올바른교육 온라인 학습관에 오신 것을 환영합니다.",
    internalEmailDomain: "jslms.local",
    logoPath: "/image/logo-allbarreun.png",
    productionSiteUrl: "https://allbarreun-edu.vercel.app",
    primaryColor: "#2563EB",
  },
};

export function resolveAcademyId(raw: string | undefined): AcademyId {
  if (raw === "iroom" || raw === "allbarreun" || raw === "jeongsu") return raw;
  return "jeongsu";
}
