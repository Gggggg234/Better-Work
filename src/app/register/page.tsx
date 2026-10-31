import { googleEnabled } from "@/lib/oauth/google";
import { RegisterForm } from "./RegisterForm";
import { inviterFromCookie } from "@/lib/referrals";
import { escrowActive } from "@/lib/payments";

const ROLE_PARAM: Record<string, string> = {
  cliente: "CLIENT",
  trabajador: "WORKER",
  empresa: "COMPANY",
  proveedor: "SUPPLIER",
};

/** `?rol=trabajador` preselecciona el tipo de cuenta (enlaces de las páginas de servicios). */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  const [inviter, escrow] = await Promise.all([inviterFromCookie(), escrowActive()]);
  return (
    <RegisterForm
      google={googleEnabled()}
      initialRole={ROLE_PARAM[rol ?? ""] ?? "CLIENT"}
      invitedBy={inviter ? inviter.name.split(/\s+/)[0] : undefined}
      escrow={escrow}
    />
  );
}
