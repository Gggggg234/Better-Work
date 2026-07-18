import { googleEnabled } from "@/lib/oauth/google";
import { LoginForm } from "./LoginForm";

/**
 * La página es un Server Component para poder consultar si Google está
 * configurado; el formulario interactivo vive en LoginForm.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string }>;
}) {
  const sp = await searchParams;
  return <LoginForm google={googleEnabled()} urlError={sp.error} />;
}
