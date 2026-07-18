import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { chooseRole } from "@/lib/actions/onboarding";
import { Brand } from "@/components/Brand";
import { Avatar } from "@/components/Avatar";

const ROLES = [
  {
    value: "CLIENT",
    icon: "🔎",
    title: "Cliente",
    desc: "Quiero contratar profesionales para trabajos puntuales.",
    next: "Empezás a buscar enseguida.",
  },
  {
    value: "WORKER",
    icon: "🛠",
    title: "Trabajador",
    desc: "Ofrezco mis servicios y quiero que me contraten.",
    next: "Seguís con tu perfil profesional: oficio, zona y fotos.",
  },
  {
    value: "COMPANY",
    icon: "🏢",
    title: "Empresa",
    desc: "Busco personal y publico oportunidades de trabajo.",
    next: "Seguís con los datos de tu empresa y el plan.",
  },
];

/**
 * Paso 1 del alta con Google: elegir el rol.
 *
 * Los pasos siguientes son los mismos formularios que ya existían para el
 * registro con contraseña, así que no se duplica nada.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  // Quien ya completó el alta no vuelve acá.
  if (me.onboarded) redirect(me.role === "ADMIN" ? "/admin" : "/app");
  const sp = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <Brand href="/" />

        <div className="flex items-center gap-3 mt-8">
          <Avatar name={me.name} url={me.avatarUrl} size={48} />
          <div className="min-w-0">
            <p className="font-semibold truncate">¡Hola, {me.name.split(" ")[0]}!</p>
            <p className="text-sm text-muted truncate">{me.email}</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold mt-6">¿Cómo vas a usar Better Work?</h1>
        <p className="text-sm text-muted mt-1">
          Elegí una opción para terminar de crear tu cuenta. Podés cambiarla después escribiéndonos.
        </p>

        {sp.error === "rol" && (
          <p className="text-sm text-red-600 mt-3" role="alert">⚠ Elegí una de las tres opciones.</p>
        )}

        <div className="space-y-3 mt-6">
          {ROLES.map((r) => (
            <form key={r.value} action={chooseRole}>
              <input type="hidden" name="role" value={r.value} />
              <button className="card w-full p-4 flex items-start gap-3.5 text-left hover:border-fg hover:shadow-md transition-all">
                <span className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-xl shrink-0">
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-sm">{r.title}</span>
                  <span className="block text-sm text-muted mt-0.5">{r.desc}</span>
                  <span className="block text-[11px] text-faint mt-1.5">{r.next}</span>
                </span>
                <span className="text-faint shrink-0 mt-3">→</span>
              </button>
            </form>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-8 justify-center">
          <span className="w-6 h-1 rounded-full bg-fg" />
          <span className="w-6 h-1 rounded-full bg-line" />
          <span className="text-xs text-faint ml-1">Paso 1 de 2</span>
        </div>
      </div>
    </main>
  );
}
