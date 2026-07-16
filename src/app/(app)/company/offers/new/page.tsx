import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createOffer } from "@/lib/actions/offers";

export default async function NewOfferPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "COMPANY") redirect("/app");

  const categories = await db.category.findMany({ where: { active: true }, orderBy: { order: "asc" } });

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Publicar oferta laboral</h1>
      <p className="text-sm text-muted mt-1">Los trabajadores de la categoría van a poder postularse.</p>

      <form action={createOffer} className="space-y-4 mt-6">
        <div>
          <label className="label">Título del puesto</label>
          <input name="title" required className="input" placeholder="Ej: Oficial electricista para obra" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" required className="input min-h-28" placeholder="Tareas, requisitos, horarios…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoría</label>
            <select name="categoryId" className="input">
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Modalidad</label>
            <select name="modality" className="input">
              <option>Presencial</option>
              <option>Remoto</option>
              <option>Híbrido</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ciudad</label>
            <input name="city" className="input" placeholder="Buenos Aires" />
          </div>
          <div>
            <label className="label">Salario (opcional)</label>
            <input name="salary" className="input" placeholder="$900.000 / mes" />
          </div>
        </div>
        <button className="btn-primary w-full !py-3">Publicar oferta</button>
      </form>
    </main>
  );
}
