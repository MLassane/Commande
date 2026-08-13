import Link from "next/link";
import CountdownTimer from "@/components/CountdownTimer";
import { getProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProduitPage({ params }: { params: { handle: string } }) {
  const product = await getProduct(params.handle);

  if (!product) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center", fontFamily: "Arial" }}>
        <h2>Produit introuvable</h2>
        <p>Ce produit n&apos;existe pas ou plus.</p>
        <Link href="/produits">← Voir tous les produits</Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#2b2b2b" }}>
      <section style={{ background: "linear-gradient(135deg,#6b3fa0,#9b5de5)", color: "#fff", textAlign: "center", padding: "60px 20px", borderRadius: "0 0 30px 30px" }}>
        <h1 style={{ fontSize: "2.2em", marginBottom: 10 }}>{product.name}</h1>
        {product.image && (
          <img
            src={product.image.startsWith("http") ? product.image : `/images/${product.image}`}
            alt={product.name}
            style={{ width: "100%", maxWidth: 320, borderRadius: 20, margin: "20px auto", display: "block", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          />
        )}
        <br />
        <CountdownTimer />
        <br />
        <div style={{ display: "inline-block", background: "#fff", color: "#6b3fa0", borderRadius: 14, padding: "15px 30px", fontWeight: "bold" }}>
          {product.oldPrice > 0 && (
            <span style={{ textDecoration: "line-through", color: "#999", fontSize: "0.9em", marginRight: 10 }}>
              {product.oldPrice.toLocaleString("fr-FR")} FCFA
            </span>
          )}
          <span style={{ fontSize: "1.5em", color: "#e63946" }}>{product.price.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <br />
        <Link
          href={`/commande?produit=${product.handle}`}
          style={{ display: "inline-block", marginTop: 25, background: "#e63946", color: "#fff", padding: "16px 40px", borderRadius: 40, fontSize: "1.1em", fontWeight: "bold", textDecoration: "none" }}
        >
          Je commande maintenant →
        </Link>
        <p style={{ marginTop: 15, fontSize: "0.9em" }}>✅ Paiement à la livraison &nbsp;|&nbsp; 🚚 Livraison rapide</p>
      </section>

      {product.description && (
        <section
          style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      )}

      <div style={{ textAlign: "center", padding: "0 20px 40px" }}>
        <Link
          href={`/commande?produit=${product.handle}`}
          style={{ display: "inline-block", background: "#e63946", color: "#fff", padding: "16px 40px", borderRadius: 40, fontSize: "1.1em", fontWeight: "bold", textDecoration: "none" }}
        >
          Je commande maintenant →
        </Link>
      </div>

      <footer style={{ textAlign: "center", padding: 30, color: "#999", fontSize: "0.85em" }}>
        <Link href="/produits" style={{ color: "#999" }}>← Voir tous les produits</Link>
      </footer>
    </div>
  );
}
