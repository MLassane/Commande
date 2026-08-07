import Link from "next/link";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProduitsPage() {
  const products = await listProducts();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#6b3fa0" }}>Nos produits</h1>

      {products.length === 0 && (
        <p style={{ textAlign: "center", color: "#666" }}>Aucun produit pour l&apos;instant.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginTop: 30 }}>
        {products.map((p) => (
          <Link
            key={p.handle}
            href={`/produit/${p.handle}`}
            style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 16, overflow: "hidden", display: "block" }}
          >
            {p.image && (
              <img src={`/images/${p.image}`} alt={p.name} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
            )}
            <div style={{ padding: 14 }}>
              <b>{p.name}</b>
              <div style={{ color: "#e63946", fontWeight: "bold", marginTop: 6 }}>
                {p.price.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
