import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveProduct, deleteProduct } from "@/lib/actions/supplies";
import { parseList } from "@/lib/supplies";
import { BackButton } from "@/components/BackButton";
import { ProductForm } from "@/components/supplies/ProductForm";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { PRODUCT_ERRORS } from "../errors";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me?.supplierProfile) redirect("/proveedor");
  const { id } = await params;
  const sp = await searchParams;

  const p = await db.product.findUnique({ where: { id } });
  if (!p || p.supplierId !== me.supplierProfile.id) notFound();

  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <div>
        <BackButton fallback="/proveedor/productos" />
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Editar producto</h1>
          <Link href={`/materiales/p/${p.id}`} className="btn-ghost !text-xs !px-2.5">
            <ExternalLink className="w-3.5 h-3.5" aria-hidden /> Ver como comprador
          </Link>
        </div>
        {p.hidden && (
          <p className="text-sm text-danger mt-1">Este producto fue ocultado por moderación. Escribinos a soporte si creés que es un error.</p>
        )}
      </div>
      {sp.error && PRODUCT_ERRORS[sp.error] && (
        <div className="card p-4 !border-danger/40" role="alert">
          <p className="text-sm text-danger">{PRODUCT_ERRORS[sp.error]}</p>
        </div>
      )}
      <ProductForm
        action={saveProduct.bind(null, p.id)}
        initial={{
          name: p.name,
          description: p.description,
          category: p.category,
          brand: p.brand,
          unit: p.unit,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          stock: p.stock,
          sku: p.sku,
          images: parseList(p.images),
          active: p.active,
        }}
      />
      <div className="flex justify-center">
        <ConfirmDeleteButton
          action={deleteProduct.bind(null, p.id)}
          confirmText={`¿Borrar «${p.name}»? Los pedidos que ya lo incluyen no se modifican.`}
          label="Borrar producto"
        />
      </div>
    </main>
  );
}
