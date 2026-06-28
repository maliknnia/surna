import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCodeImage({
  value,
  size = 160,
  className = "",
  alt = "QR code",
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!value) {
      setDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-white rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-[11px] text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return <img src={dataUrl} alt={alt} className={`rounded-xl ${className}`} width={size} height={size} />;
}
