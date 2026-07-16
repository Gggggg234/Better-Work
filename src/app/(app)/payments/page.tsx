import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addPaymentAccount, deletePaymentAccount, setDefaultPaymentAccount } from "@/lib/actions/payments";
import { PaymentAccountForm } from "@/components/payments/PaymentAccountForm";
import { providerIcon, accountSummary } from "@/lib/payments/accounts";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; from?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const backHref = sp.from === "worker" ? "/worker/profile" : null;

  const isWorker = me.role === "WORKER";
  const purpose = isWorker ? "PAYOUT" : "PAYMENT";

  const accounts = await db.paymentAccount.findMany({
    where: { userId: me.id, purpose },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      {backHref && (
        <Link href={backHref} className="btn-ghost !px-2 -ml-2 mb-2 !text-sm">
          ← Volver a mi perfil
        </Link>
      )}
      <h1 className="text-2xl font-bold">{isWorker ? "Cuenta de cobro" : "Métodos de pago"}</h1>
      <p className="text-sm text-muted mt-1">
        {isWorker
          ? "Cuando un trabajo termina, Better Work te transfiere el pago (menos la comisión de servicio) a la cuenta que elijas."
          : "Pagás los trabajos a través de Better Work: el dinero queda protegido y se libera al trabajador cuando el trabajo finaliza."}
      </p>

      {sp.error === "detalle" && (
        <p className="text-sm text-red-600 mt-3">Completá el dato de la cuenta para vincularla.</p>
      )}

      {/* Cuentas vinculadas */}
      <div className="space-y-2.5 mt-6">
        {accounts.map((a) => (
          <div key={a.id} className={`card p-4 flex items-center gap-3 ${a.isDefault ? "border-fg" : ""}`}>
            <span className="text-2xl w-10 text-center shrink-0">{providerIcon(a.provider)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{accountSummary(a)}</p>
                {a.isDefault && (
                  <span className="rounded-full bg-fg text-bg px-2 py-0.5 text-[11px] font-medium">Predeterminada</span>
                )}
              </div>
              {a.holder && <p className="text-xs text-muted">{a.holder}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {!a.isDefault && (
                <form action={setDefaultPaymentAccount.bind(null, a.id)}>
                  <button className="btn-secondary !py-1.5 !px-2.5 !text-xs">Usar</button>
                </form>
              )}
              <form action={deletePaymentAccount.bind(null, a.id)}>
                <button className="btn-ghost !py-1.5 !px-2.5 !text-xs text-red-600">Quitar</button>
              </form>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="card p-6 text-center text-sm text-faint">
            {isWorker
              ? "Todavía no vinculaste una cuenta para cobrar."
              : "Todavía no vinculaste ningún método de pago."}
          </div>
        )}
      </div>

      <div className="mt-6">
        <PaymentAccountForm purpose={purpose} action={addPaymentAccount} />
      </div>

      <div className="card p-4 mt-6 text-xs text-muted space-y-1.5">
        <p className="font-medium text-fg">¿Cómo funciona el pago por Better Work?</p>
        <p>1. El cliente paga el trabajo con su método vinculado.</p>
        <p>2. Better Work retiene el dinero de forma segura mientras dura el trabajo.</p>
        <p>3. Al ingresar el código de finalización, se libera el pago al trabajador, descontando la comisión de servicio.</p>
        <p>4. Si el trabajo se cancela antes de empezar, el dinero se devuelve al cliente.</p>
      </div>
    </main>
  );
}
