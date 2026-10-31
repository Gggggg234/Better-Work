import { googleEnabled } from "@/lib/oauth/google";
import { RegisterForm } from "./RegisterForm";

const ROLE_PARAM: Record<string, string> = { cliente: "CLIENT", trabajador: "WORKER", empresa: "COMPANY" };

/** `?rol=trabajador` preselecciona el tipo de cuenta (enlaces de las páginas de servicios). */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  return <RegisterForm google={googleEnabled()} initialRole={ROLE_PARAM[rol ?? ""] ?? "CLIENT"} />;
}
