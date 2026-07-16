"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <Brand href="/" />
        <h1 className="text-2xl font-bold mt-8">Ingresá a tu cuenta</h1>
        <p className="text-sm text-muted mt-1">Bienvenido de nuevo.</p>

        <form action={action} className="space-y-4 mt-8">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="tu@email.com" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input name="password" type="password" required className="input" placeholder="••••••••" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="btn-primary w-full !py-3">
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="text-sm text-muted mt-6 text-center">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-fg underline">Registrate</Link>
        </p>

        <div className="card p-4 mt-8 text-xs text-muted space-y-1">
          <p className="font-medium text-fg">Cuentas de prueba (contraseña: demo1234)</p>
          <p>Cliente: cliente@demo.com</p>
          <p>Trabajador: jorge.paredes@demo.com</p>
          <p>Empresa: empresa@demo.com</p>
          <p>Admin: admin@betterwork.app</p>
        </div>
      </div>
    </main>
  );
}
