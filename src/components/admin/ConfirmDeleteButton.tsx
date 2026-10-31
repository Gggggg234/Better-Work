"use client";

/** Botón de borrado con confirmación nativa antes de mandar el form. */
export function ConfirmDeleteButton({
  action,
  confirmText,
  label = "Eliminar cuenta",
}: {
  action: () => Promise<void>;
  confirmText: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button className="btn-ghost !py-1.5 !px-2.5 !text-xs text-red-600">{label}</button>
    </form>
  );
}
