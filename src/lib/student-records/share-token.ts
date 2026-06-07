import {
  generateShareToken,
  resolveShareBaseUrl,
  shareExpiresAt,
} from "@/lib/reports/share-token";

export { generateShareToken, resolveShareBaseUrl, shareExpiresAt };

export function buildStudentRecordShareUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? resolveShareBaseUrl()).replace(/\/$/, "");
  return `${base}/student-record/share/${token}`;
}
