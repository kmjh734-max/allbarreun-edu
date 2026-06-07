import {
  generateShareToken,
  resolveShareBaseUrl,
  shareExpiresAt,
} from "@/lib/reports/share-token";
import { SITE_URL } from "@/lib/branding";

export { generateShareToken, resolveShareBaseUrl, shareExpiresAt };

export function buildStudentRecordShareUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? SITE_URL).replace(/\/$/, "");
  return `${base}/student-record/share/${token}`;
}
