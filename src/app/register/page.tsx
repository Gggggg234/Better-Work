"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { register } from "@/lib/actions/auth";
import { Brand } from "@/components/Brand";

const ROLES = [
  { value: "CLIENT", title: "Cliente", desc: "Quiero contratar servicios" },
  { value: "WORKER", title: "Trabajador", desc: "Quiero ofrecer mis servicios" },
  { value: "COMPANY", title: "Empresa", desc: "Busco personal y servicios" },
];

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, undefined);
  const [role, setRole] = useState("CLIENT");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <Brand href="/" />
        <h1 className="text-2xl font-bold mt-8">Creá tu cuenta</h1>
        <p className="text-sm text-muted mt-1">Elegí cómo querés usar Better Work.</p>

        <form action={action} className="space-y-4 mt-8">
          <input type="hidden" name="role" value={role} />
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  role === r.value ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/40"
                }`}
              >
                <p className="text-sm font-semibold">{r.title}</p>
                <p className={`text-[10px] mt-0.5 ${role === r.value ? "text-bg/70" : "text-faint"}`}>
                  {r.desc}
                </p>
              </button>
            ))}
          </div>

          <div>
            <label className="label">{role === "COMPANY" ? "Nombre de la empresa" : "Nombre y apellido"}</label>
            <input name="name" required className="input" placeholder={role === "COMPANY" ? "Mi Empresa S.A." : "Juan Pérez"} />
          </div>
          {role === "WORKER" && (
            <p className="text-xs text-muted">Después de crear la cuenta vas a completar tu perfil profesional paso a paso.</p>
          )}
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="tu@email.com" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input name="password" type="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="btn-primary w-full !py-3">
            {pending ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-sm text-muted mt-6 text-center">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-fg underline">Ingresá</Link>
        </p>
      </div>
    </main>
  );
}
