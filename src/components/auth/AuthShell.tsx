import Link from "next/link";
import { MapPin, ShieldCheck, Star } from "lucide-react";

const POINTS = [
  { icon: MapPin, text: "Profesionales y comercios cerca tuyo, en el mapa" },
  { icon: ShieldCheck, text: "Perfiles verificados y códigos de inicio y fin" },
  { icon: Star, text: "Reseñas reales de cada trabajo terminado" },
];

/**
 * Marco de las pantallas de ingreso y registro: en el celular, encabezado con
 * el degradé de marca y el formulario en una tarjeta; en escritorio, pantalla
 * partida con la propuesta de valor a la izquierda.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Marca */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden />
        <div className="absolute -right-20 -bottom-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative px-6 pt-8 pb-20 lg:p-14 lg:h-full lg:flex lg:flex-col lg:justify-between max-w-xl">
          <Link href="/" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-[22%] ring-2 ring-white/30" />
            <span className="text-lg font-extrabold tracking-tight">Manobra</span>
          </Link>
          <div className="mt-8 lg:mt-0">
            <h2 className="text-[28px] lg:text-5xl leading-[1.08] font-extrabold tracking-tight">
              El profesional que necesitás, <span className="text-white/70">a un toque.</span>
            </h2>
            <ul className="hidden lg:block mt-8 space-y-4">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-white/85">
                  <span className="w-10 h-10 rounded-2xl bg-white/12 flex items-center justify-center">
                    <p.icon className="w-5 h-5" aria-hidden />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="hidden lg:block text-xs text-white/50">© Manobra · Hecho en Argentina</p>
        </div>
      </section>

      {/* Formulario */}
      <section className="relative -mt-12 lg:mt-0 px-4 pb-10 lg:flex lg:items-center lg:justify-center lg:p-10">
        <div className="card !rounded-[28px] p-6 sm:p-8 w-full max-w-md mx-auto animate-pop-in lg:shadow-float">{children}</div>
      </section>
    </main>
  );
}
