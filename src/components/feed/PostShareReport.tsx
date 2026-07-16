"use client";

import { useState } from "react";

/** Compartir (copia el link e incrementa el contador) y denunciar (con motivo). */
export function PostShareReport({
  postId,
  shareCount,
  onShare,
  onReport,
  canReport,
}: {
  postId: string;
  shareCount: number;
  onShare: () => Promise<void>;
  onReport: (fd: FormData) => Promise<void>;
  canReport: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);

  async function share() {
    const url = `${location.origin}/feed/${postId}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "Better Work" });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* cancelado */
    }
    onShare();
  }

  function report() {
    const reason = prompt("¿Por qué querés denunciar esta publicación?");
    if (!reason) return;
    const fd = new FormData();
    fd.set("reason", reason);
    onReport(fd);
    setReported(true);
  }

  return (
    <>
      <button onClick={share} className="flex items-center gap-1.5 text-muted hover:text-fg transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {copied ? "Copiado" : shareCount > 0 ? shareCount : "Compartir"}
      </button>
      {canReport && (
        <button
          onClick={report}
          disabled={reported}
          className="text-muted hover:text-fg transition disabled:opacity-50"
          title="Denunciar"
        >
          {reported ? "Denunciado" : "⋯"}
        </button>
      )}
    </>
  );
}
