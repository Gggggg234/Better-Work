import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** El panel es sólo para cuentas de proveedor. */
export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "SUPPLIER") redirect("/materiales");
  return children;
}
