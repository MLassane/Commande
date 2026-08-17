"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products";

export default function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");

  // Recherche simple, insensible à la casse et aux accents, sur le nom
  // du produit uniquement (le plus utile pour un catalogue de quelques
  // dizaines de produits).
  const filtered = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = normalize(query.trim());
    if (!q) return products;
    return products.filter((p) => normalize(p.name).includes(q));
  }, [products, query]);

  return (
    <>
      <div style={{ maxWidth: 400, margin: "24px auto 0" }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd", boxSizing: "border-box", fontSize: "1em" }}
        />
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#666", marginTop: 30 }}>
          Aucun produit ne correspond à &quot;{query}&quot;.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginTop: 30 }}>
        {filtered.map((p) => (
          <Link
            key={p.handle}
            href={`/produit/${p.handle}`}
            style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 16, overflow: "hidden", display: "block" }}
          >
            {p.image && (
              <img src={p.image.startsWith("http") ? p.image : `/images/${p.image}`} alt={p.name} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
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
    </>
  );
}
