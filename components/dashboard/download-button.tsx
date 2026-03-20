"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type DownloadButtonProps = {
  url: string;
  filename?: string;
  className?: string;
  label?: string;
  children?: ReactNode;
};

/**
 * iOS Safari-д <a download> болон прямой fetch() нь cross-origin URL-д
 * ажилладаггүй (CORS). Иймд /api/download proxy route ашиглан
 * файлыг сервер талаас татаж, blob болгон клиент рүү өгнө.
 */
export function DownloadButton({
  url,
  filename,
  className = "rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600",
  label = "Татах",
  children,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      // Server-side proxy-оор CORS-г давна
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        // cookie/session заавал явуулах (ялангуяа зарим орчинд default өөр байж болдог)
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        // Session байхгүй бол гадны raw URL нээхээс илүү auth руу явуулсан нь зөв.
        if (response.status === 401) {
          window.location.href = "/auth";
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Filename: prop-оос эсвэл URL-аас гаргана
      const name =
        filename ??
        (() => {
          try {
            const pathname = new URL(url).pathname;
            return decodeURIComponent(pathname.split("/").pop() ?? "download");
          } catch {
            return "download";
          }
        })();

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Blob URL-г 5 секундийн дараа цэвэрлэнэ
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (err) {
      console.error("Download failed:", err);
      // Эцсийн fallback — шинэ tab-д нээнэ
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? "Татаж байна…" : children ?? label}
    </button>
  );
}
