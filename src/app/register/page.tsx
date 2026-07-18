import { googleEnabled } from "@/lib/oauth/google";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  return <RegisterForm google={googleEnabled()} />;
}
