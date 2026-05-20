export const STUDENT_EMAIL_DOMAIN = "jslms.local";

const USERNAME_PATTERN = /^[a-z0-9]{3,32}$/;

/** 로그인 아이디: 영문 소문자·숫자만, 3~32자 */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function toInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@${STUDENT_EMAIL_DOMAIN}`;
}

/**
 * 로그인 식별자 → Supabase Auth 이메일
 * @ 포함 시 그대로(관리자·강사), 없으면 학생 아이디 → @jslms.local
 */
export function resolveLoginEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return toInternalEmail(trimmed);
}

export function formatInternalEmailHint(username: string | null): string | null {
  if (!username) return null;
  return toInternalEmail(username);
}
