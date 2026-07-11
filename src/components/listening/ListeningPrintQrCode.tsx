"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ListeningPrintQrCodeProps {
  url: string;
  sizePx?: number;
}

export function ListeningPrintQrCode({
  url,
  sizePx = 96,
}: ListeningPrintQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: sizePx,
      margin: 1,
      color: { dark: "#0c4a6e", light: "#ffffff" },
    })
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, sizePx]);

  if (!dataUrl) {
    return (
      <div
        className="rounded-md bg-white ring-1 ring-blue-200/80"
        style={{ width: sizePx, height: sizePx }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="듣기 QR 코드"
      width={sizePx}
      height={sizePx}
      className="rounded-md bg-white p-[2px] ring-1 ring-blue-200/80"
    />
  );
}
