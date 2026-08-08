"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseCSV } from "@/lib/csv";
import type { Product } from "@/lib/products";

export default function ProduitsAdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [preview, setPreview] = useState<Product[]>([]);
  const [existing, setExisting] = useState<Product[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_secret");
    if (saved) {
      setSecret(saved);
      setUnlocked(true);
      fetchExisting();
    }
  }, []);

  async function fetchExisting() {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      setExisting(data.products);
    }
  }

  function login() {
    sessionStorage.setItem("admin_secret", secret);
    setUnlocked(true);
    fetchExisting();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const rows = parseCSV(text);
        const headers = rows[0].map((h) => h.toLowerCase().trim());

        const isShopify = headers.includes("title") && headers.some((h) => h.includes("variant price"));

        const idx = isShopify
          ? {
              handle: headers.indexOf("handle"),
              name: headers.indexOf("title"),
              price: headers.indexOf("variant price"),
              oldPrice: headers.indexOf("variant compare at price"),
              image: headers.indexOf("image src"),
              description: headers.indexOf("body (html)"),
            }
          : {
              handle: headers.indexOf("handle"),
              name: headers.indexOf("nom"),
              price: headers.indexOf("prix"),
              oldPrice: headers.indexOf("prix_barre"),
              image: headers.indexOf("image"),
              description: headers.indexOf("description"),
            };

        if (idx.handle === -1 || idx.name === -1 || idx.price === -1) {
          setErrorMsg(
            `Le CSV doit avoir au moins les colonnes : handle, nom (ou "title"), prix (ou "variant price"). Colonnes détectées : ${headers.join(", ")}`
          );
          setPreview([]);
          return;
        }

        const products: Product[] = rows
          .slice(1)
          .map((r) => ({
            handle: (r[idx.handle] || "").trim(),
            name: (r[idx.name] || "").trim(),
            price: Math.round(parseFloat((r[idx.price] || "0").replace(",", ".").replace(/[^\d.]/g, "")) || 0),
            oldPrice:
              idx.oldPrice > -1
                ? Math.round(parseFloat((r[idx.oldPrice] || "0").replace(",", ".").replace(/[^\d.]/g, "")) || 0)
                : 0,
            image: idx.image > -1 ? (r[idx.image] || "").trim() : "",
            description: idx.description > -1 ? r[idx.description] || "" : "",
          }))
          // Sur un export Shopify, chaque produit peut avoir plusieurs lignes
          // (variantes, images supplémentaires) — on garde seulement la
          // première ligne (celle qui a un nom/titre rempli) par handle.
          .filter((p) => p.handle && p.name);

        setErrorMsg("");
        setPreview(products);
      } catch (err) {
        setErrorMsg("Impossible de lire ce fichier. Vérifie qu'il s'agit bien d'un CSV.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function importProducts() {
    setStatus("loading");
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ products: preview }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      setPreview([]);
      fetchExisting();
    } catch {
      setStatus("error");
    }
  }

  async function removeProduct(handle: string) {
    if (!confirm(`Supprimer le produit "${handle}" ?`)) return;
    const res = await fetch(`/api/products/${handle}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    if (res.ok) setExisting((prev) => prev.filter((p) => p.handle !== handle));
  }

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "Arial" }}>
        <h2>Accès admin</h2>
        <input
          type="password"
          placeholder="Code secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <button onClick={login} style={{ width: "100%", padding: 10 }}>Entrer</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h1>📦 Catalogue produits</h1>
      <p style={{ color: "#666" }}>
        Importe un fichier CSV avec les colonnes : <code>handle, nom, prix, prix_barre, image, description</code>
      </p>

      <input type="file" accept=".csv" onChange={handleFile} style={{ marginBottom: 20 }} />

      {errorMsg && <p style={{ color: "#e63946" }}>{errorMsg}</p>}

      {preview.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h3>Aperçu ({preview.length} produit{preview.length > 1 ? "s" : ""})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
            <thead>
              <tr style={{ background: "#f6f0fb", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Handle</th>
                <th style={{ padding: 8 }}>Nom</th>
                <th style={{ padding: 8 }}>Prix</th>
                <th style={{ padding: 8 }}>Image</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.handle} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{p.handle}</td>
                  <td style={{ padding: 8 }}>{p.name}</td>
                  <td style={{ padding: 8 }}>{p.price.toLocaleString("fr-FR")} FCFA</td>
                  <td style={{ padding: 8 }}>{p.image}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={importProducts}
            disabled={status === "loading"}
            style={{ marginTop: 16, background: "#2a9d8f", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
          >
            {status === "loading" ? "Import..." : `✅ Importer ces ${preview.length} produits`}
          </button>
          {status === "done" && <p style={{ color: "#2a9d8f" }}>Produits importés avec succès ✅</p>}
          {status === "error" && <p style={{ color: "#e63946" }}>Erreur lors de l&apos;import.</p>}
        </div>
      )}

      <h2>Produits déjà en ligne ({existing.length})</h2>
      {existing.length === 0 && <p>Aucun produit importé pour l&apos;instant.</p>}
      {existing.map((p) => (
        <div key={p.handle} style={{ border: "1px solid #eee", borderRadius: 10, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>{p.name}</b> — {p.price.toLocaleString("fr-FR")} FCFA
            <br />
            <Link href={`/produit/${p.handle}`} style={{ fontSize: "0.85em" }}>/produit/{p.handle} →</Link>
          </div>
          <button
            onClick={() => removeProduct(p.handle)}
            style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer" }}
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}
