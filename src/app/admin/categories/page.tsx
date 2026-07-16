import { db } from "@/lib/db";
import { createCategory, toggleCategory } from "@/lib/actions/admin";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { workers: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Categorías</h1>

      <form action={createCategory} className="card p-4 flex gap-2 max-w-md">
        <input name="icon" placeholder="🔧" className="input !w-16 text-center" maxLength={4} />
        <input name="name" required placeholder="Nueva categoría…" className="input" />
        <button className="btn-primary shrink-0">Agregar</button>
      </form>

      <div className="grid sm:grid-cols-2 gap-2">
        {categories.map((c) => (
          <div key={c.id} className={`card p-4 flex items-center gap-3 ${c.active ? "" : "opacity-50"}`}>
            <span className="text-xl">{c.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-faint">{c._count.workers} trabajadores</p>
            </div>
            <form action={toggleCategory.bind(null, c.id)}>
              <button className="btn-ghost !py-1.5 !px-2.5 !text-xs">{c.active ? "Desactivar" : "Activar"}</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
