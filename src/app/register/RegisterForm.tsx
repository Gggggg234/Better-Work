"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { register, resendVerification } from "@/lib/actions/auth";
import { Brand } from "@/components/Brand";
import {
  Field,
  Notice,
  PasswordInput,
  PasswordStrength,
  GoogleButton,
  VerificationNotice,
  SubmitButton,
} from "@/components/auth/AuthUI";

const ROLES = [
  { value: "CLIENT", title: "Cliente", desc: "Quiero contratar" },
  { value: "WORKER", title: "Trabajador", desc: "Ofrezco servicios" },
  { value: "COMPANY", title: "Empresa", desc: "Busco personal" },
];

export function RegisterForm({ google }: { google: boolean }) {
  const [state, action, pending] = useActionState(register, undefined);
  const [resendState, resendAction, resending] = useActionState(resendVerification, undefined);
  const [role, setRole] = useState("CLIENT");
  const [password, setPassword] = useState("");

  const done = state?.needsVerification;
  const verify = resendState?.needsVerification ? resendState : state;

  // Cuenta creada: la pantalla pasa a ser el aviso de verificación.
  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-fade-up">
          <Brand href="/" />
          <h1 className="text-2xl font-bold mt-8">Ya casi está</h1>
          <p className="text-sm text-muted mt-1">Falta un paso para activar tu cuenta.</p>

          <VerificationNotice email={verify?.email} devLink={verify?.devLink} />

          <form action={resendAction} className="mt-2">
            <input type="hidden" name="email" value={verify?.email ?? ""} />
            <button disabled={resending} className="btn-ghost w-full !py-2 !text-xs">
              {resending ? "Reenviando…" : "No me llegó, reenviar"}
            </button>
          </form>
          {resendState?.ok && <p className="text-xs text-muted mt-2 text-center">{resendState.ok}</p>}

          <Link href="/login" className="btn-secondary w-full mt-4 !py-3">Ir al inicio de sesión</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <Brand href="/" />
        <h1 className="text-2xl font-bold mt-8">Creá tu cuenta</h1>
        <p className="text-sm text-muted mt-1">Elegí cómo querés usar Better Work.</p>

        <form action={action} className="space-y-4 mt-8">
          <input type="hidden" name="role" value={role} />

          {state?.error && <Notice kind="error">{state.error}</Notice>}

          <div>
            <span className="label">Tipo de cuenta</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de cuenta">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={role === r.value}
                  onClick={() => setRole(r.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    role === r.value ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className={`text-[10px] mt-0.5 ${role === r.value ? "text-bg/70" : "text-faint"}`}>{r.desc}</p>
                </button>
              ))}
            </div>
            {state?.fields?.role && <p className="text-xs text-red-600 mt-1">⚠ {state.fields.role}</p>}
          </div>

          <Field
            label={role === "COMPANY" ? "Nombre de la empresa" : "Nombre y apellido"}
            name="name"
            error={state?.fields?.name}
          >
            <input
              id="name"
              name="name"
              required
              autoComplete={role === "COMPANY" ? "organization" : "name"}
              className="input"
              placeholder={role === "COMPANY" ? "Mi Empresa S.A." : "Juan Pérez"}
              defaultValue={state?.values?.name ?? ""}
              aria-invalid={state?.fields?.name ? true : undefined}
            />
          </Field>

          <Field label="Email" name="email" error={state?.fields?.email} hint="Te vamos a enviar un enlace de confirmación.">
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

          <div>
            <Field label="Contraseña" name="password" error={state?.fields?.password}>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                placeholder="Creá una contraseña segura"
                value={password}
                onChange={setPassword}
                invalid={!!state?.fields?.password}
              />
            </Field>
            <PasswordStrength value={password} />
          </div>

          <Field label="Repetir contraseña" name="confirm" error={state?.fields?.confirm}>
            <PasswordInput
              name="confirm"
              autoComplete="new-password"
              placeholder="Escribila de nuevo"
              invalid={!!state?.fields?.confirm}
            />
          </Field>

          {role === "WORKER" && (
            <p className="text-xs text-muted">
              Después de confirmar tu email vas a completar tu perfil profesional paso a paso.
            </p>
          )}

          <SubmitButton pending={pending} pendingLabel="Creando cuenta…">Crear cuenta</SubmitButton>
        </form>

        {google && <GoogleButton label="Registrarme con Google" />}

        <p className="text-sm text-muted mt-6 text-center">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-fg underline">Ingresá</Link>
        </p>
      </div>
    </main>
  );
}
