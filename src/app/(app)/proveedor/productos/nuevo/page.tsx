import { saveProduct } from "@/lib/actions/supplies";
import { BackButton } from "@/components/BackButton";
import { ProductForm } from "@/components/supplies/ProductForm";
import { PRODUCT_ERRORS } from "../errors";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-5 space-y-5 animate-fade-up">
      <div>
        <BackButton fallback="/proveedor/productos" />
        <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
        <p className="text-sm text-muted mt-0.5">Completá lo básico: nombre, rubro, precio y una buena foto.</p>
      </div>
      {sp.error && PRODUCT_ERRORS[sp.error] && (
        <div className="card p-4 !border-danger/40" role="alert">
          <p className="text-sm text-danger">{PRODUCT_ERRORS[sp.error]}</p>
        </div>
      )}
      <ProductForm
        action={saveProduct.bind(null, null)}
        initial={{
          name: "",
          description: "",
          category: "",
          brand: "",
          unit: "unidad",
          price: null,
          compareAtPrice: null,
          stock: null,
          sku: "",
          images: [],
          active: true,
        }}
      />
    </main>
  );
}
