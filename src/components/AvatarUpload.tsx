"use client";

import { useRef, useState } from "react";
import { Avatar } from "./Avatar";

/**
 * Foto de perfil con cambio en un toque: al elegir el archivo se sube
 * automáticamente (sin botón extra ni URLs manuales).
 */
export function AvatarUpload({
  name,
  url,
  action,
}: {
  name: string;
  url?: string | null;
  action: (fd: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);

  return (
    <form ref={formRef} action={action} className="relative inline-block">
      <Avatar name={name} url={url} size={64} />
      <label
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-fg text-bg flex items-center justify-center text-xs cursor-pointer border-2 border-bg hover:opacity-90 transition"
        title="Cambiar foto de perfil"
      >
        {saving ? "…" : "✎"}
        <input
          type="file"
          name="avatarFile"
          accept="image/*"
          className="hidden"
          onChange={() => {
            setSaving(true);
            formRef.current?.requestSubmit();
          }}
        />
      </label>
    </form>
  );
}
