"use client";

import { useSyncExternalStore } from "react";
import { CopyField } from "@/components/CopyField";

const subscribe = () => () => {};

/** Compartir el link de invitación: WhatsApp primero (es donde se habla en Argentina). */
export function ShareInvite({ link, message }: { link: string; message: string }) {
  // El menú nativo de compartir sólo existe en el navegador (y no en todos).
  const canShare = useSyncExternalStore(
    subscribe,
    () => typeof navigator.share === "function",
    () => false
  );
  const text = `${message} ${link}`;

  return (
    <div className="space-y-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className="btn-primary w-full !py-3"
      >
        Compartir por WhatsApp
      </a>
      {canShare && (
        <button
          type="button"
          onClick={() => navigator.share({ text: message, url: link }).catch(() => {})}
          className="btn-secondary w-full !py-3"
        >
          Compartir por otra app
        </button>
      )}
      <CopyField label="Tu link" value={link} />
    </div>
  );
}
