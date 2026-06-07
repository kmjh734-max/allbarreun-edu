import type { Metadata } from "next";
import { ACADEMY_NAME, OG_IMAGE_URL, SITE_NAME } from "@/lib/branding";
import { lookupSharedStudentRecord } from "@/lib/student-records/get-shared-record";
import { buildStudentRecordShareUrl } from "@/lib/student-records/share-token";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const lookup = await lookupSharedStudentRecord(token);
  const pageUrl = buildStudentRecordShareUrl(token);

  if (lookup.status !== "ok") {
    return {
      title: `학생부 분석 리포트 | ${ACADEMY_NAME}`,
      robots: { index: false, follow: false },
    };
  }

  const { studentName } = lookup.payload;
  const title = "학생부 분석 리포트";
  const description = `${studentName} 학생 학교생활기록부 분석 보고서입니다.`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: pageUrl,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630 }],
    },
  };
}

export default async function SharedStudentRecordPage({ params }: PageProps) {
  const { token } = await params;
  const lookup = await lookupSharedStudentRecord(token);

  if (lookup.status !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            {lookup.status === "expired"
              ? "만료된 보고서입니다"
              : "보고서를 찾을 수 없습니다"}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {lookup.status === "expired"
              ? "이 링크는 열람 기간이 만료되었습니다."
              : "유효하지 않은 링크입니다."}
            <br />
            {ACADEMY_NAME}에 새 링크를 요청해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const { payload } = lookup;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600">
        <strong className="text-slate-900">{payload.studentName}</strong> 학생 · 학생부
        분석 리포트
        <span className="mx-2 text-slate-300">|</span>
        생성: {new Date(payload.generatedAt).toLocaleString("ko-KR")}
      </header>
      <iframe
        title={`${payload.studentName} 학생부 분석`}
        srcDoc={payload.html}
        className="min-h-[calc(100vh-52px)] w-full border-0 bg-white"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
