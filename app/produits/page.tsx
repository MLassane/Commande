import { listProducts } from "@/lib/products";
import ProductSearch from "@/components/ProductSearch";

export const dynamic = "force-dynamic";

export default async function ProduitsPage() {
  const products = await listProducts();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#6b3fa0" }}>Nos produits</h1>

      {products.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666" }}>Aucun produit pour l&apos;instant.</p>
      ) : (
        // La recherche se fait côté client (ProductSearch), pour filtrer
        // instantanément sans recharger la page à chaque frappe.
        <ProductSearch products={products} />
      )}
    </div>
  );
}
