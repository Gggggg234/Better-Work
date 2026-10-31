import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MaterialsHeader } from "@/components/supplies/MaterialsHeader";
import { CartView } from "@/components/supplies/CartView";

export default async function CartPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-up">
      <MaterialsHeader tab="carrito" title="Carrito" subtitle="Revisá tu pedido y envíaselo a cada proveedor." />
      <CartView />
    </main>
  );
}
