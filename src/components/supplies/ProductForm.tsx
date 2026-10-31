"use client";

import { useState } from "react";
import { X, ImagePlus } from "lucide-react";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/lib/supplies";

export type ProductFormInitial = {
  name: string;
  description: string;
  category: string;
  brand: string;
  unit: string;
  price: number | null;
  compareAtPrice: number | null;
  stock: number | null;
  sku: string;
  images: string[];
  active: boolean;
};

const MAX_IMAGES = 6;

/** Alta y edición de un producto. Las fotos quitadas se borran al guardar. */
export function ProductForm({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<void>;
  initial: ProductFormInitial;
}) {
  const [kept, setKept] = useState(initial.images);
  const [previews, setPreviews] = useState<string[]>([]);
  const [price, setPrice] = useState(initial.price?.toString() ?? "");
  const [compare, setCompare] = useState(initial.compareAtPrice?.toString() ?? "");

  const p = parseFloat(price);
  const c = parseFloat(compare);
  const discount = p > 0 && c > p ? Math.round((1 - p / c) * 100) : 0;
  const room = MAX_IMAGES - kept.length;

  return (
    <form action={action} className="space-y-5">
      {kept.map((u) => (
        <input key={u} type="hidden" name="keptImages" value={u} />
      ))}

      <section className="card p-5 space-y-3">
        <div>
          <h2 className="font-semibold">Fotos</h2>
          <p className="text-xs text-muted mt-0.5">Hasta {MAX_IMAGES}. La primera es la de portada. Buenas fotos venden más.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {kept.map((u) => (
            <div key={u} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-full h-full object-cover rounded-xl border border-line" />
              <button
                type="button"
                onClick={() => setKept((k) => k.filter((x) => x !== u))}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center"
                aria-label="Quitar foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {previews.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" className="aspect-square w-full object-cover rounded-xl border border-accent/40" />
          ))}
        </div>
        {room > 0 && (
          <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-4 text-sm text-muted cursor-pointer hover:border-fg/30">
            <ImagePlus className="w-5 h-5" aria-hidden />
            Agregar fotos ({room} disponibles)
            <input
              type="file"
              name="images"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) =>
                setPreviews(Array.from(e.target.files ?? []).slice(0, room).map((f) => URL.createObjectURL(f)))
              }
            />
          </label>
        )}
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Datos del producto</h2>
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <input id="name" name="name" required maxLength={120} defaultValue={initial.name} className="input" placeholder="Ej: Caño PVC 110 mm x 4 m" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="category">Rubro</label>
            <select id="category" name="category" required defaultValue={initial.category} className="input">
              <option value="" disabled>Elegí</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="brand">Marca (opcional)</label>
            <input id="brand" name="brand" maxLength={60} defaultValue={initial.brand} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción (opcional)</label>
          <textarea
            id="description"
            name="description"
            maxLength={2000}
            defaultValue={initial.description}
            className="input min-h-24"
            placeholder="Medidas, material, para qué sirve, rendimiento…"
          />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Precio y stock</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="price">Precio</label>
            <input
              id="price"
              name="price"
              type="number"
              required
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input"
              placeholder="$"
            />
          </div>
          <div>
            <label className="label" htmlFor="unit">Se vende por</label>
            <select id="unit" name="unit" defaultValue={initial.unit} className="input">
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="compareAtPrice">Precio anterior (para mostrar una oferta)</label>
          <input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            min="0"
            step="0.01"
            value={compare}
            onChange={(e) => setCompare(e.target.value)}
            className="input"
            placeholder="Opcional"
          />
          <p className="text-xs mt-1 text-faint">
            {discount > 0 ? <span className="text-success font-medium">Se va a mostrar con {discount}% de descuento.</span> : "Si es mayor al precio, el producto aparece en Ofertas."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="stock">Stock</label>
            <input id="stock" name="stock" type="number" min="0" step="1" defaultValue={initial.stock ?? ""} className="input" placeholder="Sin control" />
            <p className="text-xs text-faint mt-1">Vacío = sin control (se muestra &quot;Consultar stock&quot;).</p>
          </div>
          <div>
            <label className="label" htmlFor="sku">Código interno (opcional)</label>
            <input id="sku" name="sku" maxLength={60} defaultValue={initial.sku} className="input" />
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={initial.active} className="mt-0.5 w-4 h-4 accent-current" />
          <span>
            <span className="font-medium">Publicado</span>
            <span className="block text-xs text-muted">Desmarcalo para pausarlo sin borrarlo.</span>
          </span>
        </label>
      </section>

      <FormSubmitButton pendingLabel="Guardando…">Guardar producto</FormSubmitButton>
    </form>
  );
}
