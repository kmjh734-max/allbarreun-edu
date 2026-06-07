/** Vercel 업로드 본문 한도를 고려 */
export const STUDENT_RECORD_MAX_TOTAL_BYTES = 4_000_000;
export const STUDENT_RECORD_MAX_PDF_BYTES = 4 * 1024 * 1024;
export const STUDENT_RECORD_MAX_IMAGE_BYTES = 1 * 1024 * 1024;

/** 직접 업로드하는 JPG/PNG */
export const STUDENT_RECORD_MAX_DIRECT_IMAGES = 10;

/** 스캔 PDF → Vision 변환 최대 페이지 */
export const STUDENT_RECORD_MAX_PDF_PAGES = 40;

/** PDF 페이지 렌더 해상도 (OCR 정확도 — 2000px 권장) */
export const STUDENT_RECORD_PDF_RENDER_WIDTH = 2000;

/** Vision 1회 API 호출당 페이지 수 (1 = 페이지별 고품질) */
export const STUDENT_RECORD_VISION_BATCH_SIZE = 1;

/** 클라이언트 PDF→JPEG 변환 후 업로드 예산 (전체) */
export const STUDENT_RECORD_PREPARED_UPLOAD_BUDGET = 3_600_000;

/** OCR extract API 1회당 이미지 수 (4MB 한도 — 품질 위해 4장) */
export const STUDENT_RECORD_EXTRACT_CHUNK_PAGES = 4;

/** 페이지 JPEG 목표 용량 (선명도 우선) */
export const STUDENT_RECORD_PAGE_JPEG_TARGET_BYTES = 550_000;

/** Vision OCR 동시 배치 수 */
export const STUDENT_RECORD_VISION_CONCURRENCY = 2;

/** 클라이언트 OCR 청크 병렬 요청 수 */
export const STUDENT_RECORD_EXTRACT_CHUNK_PARALLEL = 2;

/** 이 수 초과 시 배치 전사 후 텍스트-only로 최종 보고서 생성 */
export const STUDENT_RECORD_VISION_BATCH_THRESHOLD = 6;

export const STUDENT_RECORD_ANALYSIS_TIMEOUT_MS = 300_000;
