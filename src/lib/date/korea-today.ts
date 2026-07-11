/** 학생 화면 기준 오늘 날짜 (Asia/Seoul, YYYY-MM-DD) */
export function getTodayIsoKorea(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getKoreaYearMonth(date = new Date()): { year: number; month: number } {
  const iso = getTodayIsoKorea(date);
  const [y, m] = iso.split("-");
  return { year: Number(y), month: Number(m) };
}

/** YYYY-MM 또는 YYYY-M 파싱 */
export function parseKoreaMonthParam(
  value: string | null | undefined,
  fallback = getKoreaYearMonth()
): { year: number; month: number } {
  if (!value?.trim()) return fallback;
  const match = value.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;
  return { year, month };
}

export function formatKoreaMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getKoreaDayUtcBounds(iso: string): { start: string; end: string } {
  return {
    start: new Date(`${iso}T00:00:00+09:00`).toISOString(),
    end: new Date(`${iso}T23:59:59.999+09:00`).toISOString(),
  };
}

export function getMonthDateRange(
  year: number,
  month: number
): { start: string; end: string; daysInMonth: number } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  return { start, end, daysInMonth };
}
