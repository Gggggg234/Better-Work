import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFeeConfig } from "@/lib/settings";
import { aiConfigured } from "@/lib/ai/requestAssistant";
import { OpenRequestForm } from "@/components/openRequests/OpenRequestForm";
import { BackButton } from "@/components/BackButton";
import { HOURS } from "@/lib/worker";
import { todayAR } from "@/lib/format";

// El análisis de fotos con IA (server action de esta página) tarda unos segundos.
export const maxDuration = 60;

const ERRORS: Record<string, string> = {
  categoria: "Elegí qué tipo de profesional necesitás.",
  datos: "Completá qué necesitás, el barrio y la dirección.",
};

export default async function NewOpenRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sp = await searchParams;

  const [categories, fees] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, icon: true } }),
    getFeeConfig(),
  ]);
  const preselected = categories.find((c) => c.slug === sp.categoria)?.id ?? "";

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <BackButton fallback="/pedidos" />
      <h1 className="text-2xl font-bold">Pedir presupuestos</h1>
      <p className="text-sm text-muted mt-1">
        Publicá tu pedido y los profesionales de tu zona te cotizan. Comparás precios, calificaciones y tiempos, y elegís
        al que más te convenga. Pedir es gratis.
      </p>

      {sp.error && ERRORS[sp.error] && (
        <div className="card p-4 mt-5 border-red-300" role="alert">
          <p className="text-sm text-red-600">⚠ {ERRORS[sp.error]}</p>
        </div>
      )}

      <OpenRequestForm
        categories={categories}
        preselected={preselected}
        urgencyPct={fees.urgencyPct}
        today={todayAR()}
        timeOptions={HOURS.slice(6, 24)}
        aiEnabled={aiConfigured()}
      />
    </main>
  );
}
