"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, resendVerification } from "@/lib/actions/auth";
import { Brand } from "@/components/Brand";
import {
  Field,
  Notice,
  PasswordInput,
  GoogleButton,
  VerificationNotice,
  SubmitButton,
} from "@/components/auth/AuthUI";

/** Errores que pueden llegar por querystring desde el flujo de Google. */
const URL_ERRORS: Record<string, string> = {
  google: "No pudimos completar el ingreso con Google. Probá de nuevo.",
  google_off: "El ingreso con Google todavía no está habilitado.",
  google_state: "La sesión de Google venció. Intentá otra vez.",
  google_cancel: "Cancelaste el ingreso con Google.",
  google_unverified: "Tu cuenta de Google no tiene el email verificado.",
  suspended: "Tu cuenta está suspendida. Escribinos a soporte.",
};

export function LoginForm({ google, urlError }: { google: boolean; urlError?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [resendState, resendAction, resending] = useActionState(resendVerification, undefined);

  // El aviso de verificación puede venir del login o del reenvío.
  const verify = resendState?.needsVerification ? resendState : state?.needsVerification ? state : null;
  const topError = state?.error ?? (urlError ? URL_ERRORS[urlError] ?? URL_ERRORS.google : undefined);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <Brand href="/" />
        <h1 className="text-2xl font-bold mt-8">Ingresá a tu cuenta</h1>
        <p className="text-sm text-muted mt-1">Bienvenido de nuevo.</p>

        <form action={action} className="space-y-4 mt-8">
          {topError && !verify && <Notice kind="error">{topError}</Notice>}

          <Field label="Email" name="email" error={state?.fields?.email}>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder="tu@email.com"
              defaultValue={state?.values?.email ?? ""}
              aria-invalid={state?.fields?.email ? true : undefined}
            />
          </Field>

          <Field label="Contraseña" name="password" error={state?.fields?.password}>
            <PasswordInput name="password" placeholder="••••••••" invalid={!!state?.fields?.password} />
          </Field>

          <SubmitButton pending={pending} pendingLabel="Ingresando…">Ingresar</SubmitButton>
        </form>

        {verify && (
          <>
            {topError && <div className="mt-4"><Notice kind="error">{topError}</Notice></div>}
            <VerificationNotice email={verify.email} devLink={verify.devLink} />
            <form action={resendAction} className="mt-2">
              <input type="hidden" name="email" value={verify.email ?? ""} />
              <button disabled={resending} className="btn-ghost w-full !py-2 !text-xs">
                {resending ? "Reenviando…" : "No me llegó, reenviar"}
              </button>
            </form>
            {resendState?.ok && <p className="text-xs text-muted mt-2 text-center">{resendState.ok}</p>}
          </>
        )}

        {google && <GoogleButton label="Continuar con Google" />}

        <p className="text-sm text-muted mt-6 text-center">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-fg underline">Registrate</Link>
        </p>
      </div>
    </main>
  );
}
