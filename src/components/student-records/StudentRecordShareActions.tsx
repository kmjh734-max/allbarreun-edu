"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { buildStudentRecordKakaoMessage, formatStudentRecordReportSubject } from "@/lib/student-records/build-kakao-message";
import {
  isKakaoShareConfigured,
  loadKakaoSdkForReports,
  shareReportViaKakao,
  validateShareUrlForKakao,
} from "@/lib/kakao/share-report";
import type { StudentRecordAnalysisResult } from "@/lib/student-records/types";

interface StudentRecordShareActionsProps {
  result: StudentRecordAnalysisResult;
  onOpenPrint: () => void;
  onPcKakaoPrepare: () => void | Promise<void>;
}

function formatExpiresLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function StudentRecordShareActions({
  result,
  onOpenPrint,
  onPcKakaoPrepare,
}: StudentRecordShareActionsProps) {
  const { studentName } = result;
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const kakaoConfigured = isKakaoShareConfigured();

  const shareUrlWarning = shareUrl
    ? validateShareUrlForKakao(shareUrl).warning
    : null;

  useEffect(() => {
    if (kakaoConfigured) {
      void loadKakaoSdkForReports().catch(() => undefined);
    }
  }, [kakaoConfigured]);

  async function createShareLink(): Promise<string | null> {
    setLinkLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/student-records/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: result.studentId,
          studentName: result.studentName,
          html: result.html,
          generatedAt: result.generatedAt,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        shareUrl?: string;
        expiresAt?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.shareUrl) {
        setMessage(data.message ?? "공유 링크 생성에 실패했습니다.");
        return null;
      }
      setShareUrl(data.shareUrl);
      setExpiresAt(data.expiresAt ?? null);
      return data.shareUrl;
    } catch {
      setMessage("공유 링크 생성에 실패했습니다.");
      return null;
    } finally {
      setLinkLoading(false);
    }
  }

  async function handleCopyLink() {
    const url = shareUrl ?? (await createShareLink());
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("공유 링크가 복사되었습니다. 로그인 없이 열람할 수 있습니다.");
    } catch {
      setMessage("링크 복사에 실패했습니다.");
    }
  }

  async function handlePasteCopy() {
    setPasteLoading(true);
    setMessage(null);
    try {
      const url = shareUrl ?? (await createShareLink());
      if (!url) return;

      const text = buildStudentRecordKakaoMessage({ studentName, shareUrl: url });
      const copied = await navigator.clipboard.writeText(text).then(
        () => true,
        () => false
      );
      setMessage(
        copied
          ? "카카오톡에 붙여넣을 안내 문구를 복사했습니다."
          : "복사에 실패했습니다. 직접 복사해 주세요."
      );
    } finally {
      setPasteLoading(false);
    }
  }

  async function handleKakaoShare() {
    if (!kakaoConfigured) {
      setMessage("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY가 필요합니다.");
      return;
    }
    setKakaoLoading(true);
    setMessage(null);
    try {
      await loadKakaoSdkForReports();
      const url = shareUrl ?? (await createShareLink());
      if (!url) return;

      const pasteMessage = buildStudentRecordKakaoMessage({
        studentName,
        shareUrl: url,
      });
      const shareResult = await shareReportViaKakao({
        studentName,
        periodLabel: "학생부 분석",
        shareUrl: url,
        feedTitle: "학생부 분석 리포트",
        feedDescription: `${formatStudentRecordReportSubject(studentName)} 아래 링크에서 확인해 주세요.`,
        buttonTitle: "자세히 보기",
        pasteMessage,
      });
      if (shareResult.ok) {
        const hint =
          shareResult.method === "feed"
            ? "카드 링크가 안 열리면 「카카오 붙여넣기용 복사」를 사용해 주세요."
            : "메시지 본문의 URL을 눌러 보고서를 열 수 있습니다.";
        setMessage(
          `카카오톡 공유 창이 열렸습니다. 보낼 채팅방을 선택해 주세요. ${hint}`
        );
      } else if (shareResult.fallback) {
        await navigator.clipboard.writeText(pasteMessage).catch(() => undefined);
        setMessage(shareResult.message);
      } else {
        setMessage(shareResult.message);
      }
    } finally {
      setKakaoLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">보내기</p>
      <p className="text-xs text-slate-500">
        공유 링크는 로그인 없이 30일간 열람할 수 있습니다.
        {expiresAt && (
          <span className="ml-1">(만료: {formatExpiresLabel(expiresAt)})</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onOpenPrint}>
          PDF 저장 / 인쇄
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={linkLoading}
          onClick={() => void handleCopyLink()}
        >
          {linkLoading ? "링크 생성 중..." : "공유 링크 복사"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pasteLoading || linkLoading}
          onClick={() => void handlePasteCopy()}
        >
          {pasteLoading ? "복사 중..." : "카카오 붙여넣기용 복사"}
        </Button>
        <Button
          type="button"
          disabled={!kakaoConfigured || kakaoLoading || linkLoading}
          onClick={() => void handleKakaoShare()}
        >
          {kakaoLoading ? "공유 준비 중..." : "카카오톡보내기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void onPcKakaoPrepare()}>
          PC 카카오 발송 준비
        </Button>
      </div>
      {shareUrlWarning && (
        <p className="text-xs text-amber-700" role="status">
          {shareUrlWarning}
        </p>
      )}
      {message && (
        <p className="text-sm text-slate-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
