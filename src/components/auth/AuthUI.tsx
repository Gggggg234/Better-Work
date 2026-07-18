"use client";

import { useState } from "react";
import { PASSWORD_RULES, passwordStrength, STRENGTH_LABELS } from "@/lib/validation";

/** Input con error debajo, marcado para lectores de pantalla. */
export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-faint mt-1">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="text-xs text-red-600 mt-1 flex items-start gap-1">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

/** Aviso general (error u ok) en la parte de arriba del formulario. */
export function Notice({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-xl px-3.5 py-3 text-sm flex items-start gap-2 ${
        kind === "error"
          ? "bg-red-500/10 text-red-700 dark:text-red-400"
          : "bg-fg text-bg"
      }`}
    >
      <span aria-hidden className="mt-px">{kind === "error" ? "⚠" : "✓"}</span>
      <span>{children}</span>
    </div>
  );
}

/** Campo de contraseña con botón para mostrarla. */
export function PasswordInput({
  name,
  placeholder,
  value,
  onChange,
  autoComplete = "current-password",
  invalid,
}: {
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  autoComplete?: string;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="input pr-16"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${name}-error` : undefined}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-fg transition"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? "Ocultar" : "Ver"}
      </button>
    </div>
  );
}

/** Medidor de fuerza con la lista de requisitos que faltan. */
export function PasswordStrength({ value }: { value: string }) {
  const score = passwordStrength(value);
  if (!value) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? "bg-fg" : "bg-surface-2"}`}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted w-16 text-right">{STRENGTH_LABELS[score]}</span>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {PASSWORD_RULES.map((r) => {
          const done = r.test(value);
          return (
            <li
              key={r.id}
              className={`text-[11px] flex items-center gap-1.5 ${done ? "text-muted" : "text-faint"}`}
            >
              <span aria-hidden className={done ? "text-fg" : ""}>{done ? "✓" : "○"}</span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Botón de Google. El separador queda dentro para no repetirlo en cada página. */
export function GoogleButton({ label }: { label: string }) {
  return (
    <>
      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-faint">o</span>
        <div className="h-px flex-1 bg-line" />
      </div>
      <a
        href="/api/auth/google"
        className="btn-secondary w-full !py-3 flex items-center justify-center gap-2.5"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
        </svg>
        {label}
      </a>
    </>
  );
}

/**
 * Aviso de "confirmá tu email", con el enlace directo cuando no hay proveedor
 * de email configurado (sólo pasa en desarrollo).
 */
export function VerificationNotice({
  email,
  devLink,
  onResend,
  resending,
}: {
  email?: string;
  devLink?: string;
  onResend?: () => void;
  resending?: boolean;
}) {
  return (
    <div className="card p-5 mt-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-2 mx-auto flex items-center justify-center text-xl">✉️</div>
      <p className="font-semibold mt-3">Confirmá tu email</p>
      <p className="text-sm text-muted mt-1">
        Te enviamos un enlace{email ? <> a <span className="text-fg font-medium">{email}</span></> : null}. Abrilo para
        activar tu cuenta.
      </p>

      {devLink && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-left">
          <p className="text-[11px] font-medium text-fg">Modo desarrollo (sin proveedor de email)</p>
          <p className="text-[11px] text-muted mt-0.5">Usá este enlace para confirmar la cuenta:</p>
          <a href={devLink} className="text-[11px] text-fg underline break-all mt-1 block">
            {devLink}
          </a>
        </div>
      )}

      {onResend && (
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="btn-ghost w-full mt-3 !py-2 !text-xs"
        >
          {resending ? "Reenviando…" : "No me llegó, reenviar"}
        </button>
      )}
    </div>
  );
}

/** Botón de envío con spinner, para que nunca parezca que no pasó nada. */
export function SubmitButton({
  pending,
  children,
  pendingLabel,
  className = "",
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  return (
    <button disabled={pending} className={`btn-primary w-full !py-3 ${className}`}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <span
            aria-hidden
            className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}
