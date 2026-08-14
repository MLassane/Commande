"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { parseCSV } from "@/lib/csv";
import type { Product, Offer } from "@/lib/products";

// Décode une colonne "offres" au format "1:9900;2:14900;3:29900"
// (quantité:prix, séparés par ";") en tableau d'offres.
function parseOffers(raw: string): Offer[] | undefined {
  if (!raw.trim()) return undefined;
  const offers = raw
    .split(";")
    .map((part) => {
      const [qty, price] = part.split(":").map((v) => parseInt(v.trim(), 10));
      return { qty, price };
    })
    .filter((o) => o.qty > 0 && o.price > 0);
  return offers.length > 0 ? offers : undefined;
}

export default function ProduitsAdminPage() {
  // useUser() donne l'utilisateur Clerk connecté. userId sert uniquement
  // à préremplir le champ tenantId côté client pour satisfaire le typage
  // (le serveur réapplique de toute façon le vrai tenantId à partir de la
  // session, voir requireAdminTenantId() dans lib/tenant.ts — impossible
  // de tricher en envoyant un tenantId différent depuis le navigateur).
  const { user } = useUser();
  const [preview, setPreview] = useState<Product[]>([]);
  const [existing, setExisting] = useState<Product[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchExisting();
  }, []);

  async function fetchExisting() {
    // Le cookie de session Clerk est envoyé automatiquement (même origine) ;
    // l'API récupère le catalogue du marchand connecté sans header à ajouter.
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      setExisting(data.products);
    }
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
              offers: headers.indexOf("offres"),
            }
          : {
              handle: headers.indexOf("handle"),
              name: headers.indexOf("nom"),
              price: headers.indexOf("prix"),
              oldPrice: headers.indexOf("prix_barre"),
              image: headers.indexOf("image"),
              description: headers.indexOf("description"),
              offers: headers.indexOf("offres"),
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
            // Valeur indicative seulement — voir commentaire sur useUser()
            // en haut du fichier : le serveur réapplique le vrai tenantId.
            tenantId: user?.id || "",
            name: (r[idx.name] || "").trim(),
            price: Math.round(parseFloat((r[idx.price] || "0").replace(",", ".").replace(/[^\d.]/g, "")) || 0),
            oldPrice:
              idx.oldPrice > -1
                ? Math.round(parseFloat((r[idx.oldPrice] || "0").replace(",", ".").replace(/[^\d.]/g, "")) || 0)
                : 0,
            image: idx.image > -1 ? (r[idx.image] || "").trim() : "",
            description: idx.description > -1 ? r[idx.description] || "" : "",
            offers: idx.offers > -1 ? parseOffers(r[idx.offers] || "") : undefined,
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
        headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`/api/products/${handle}`, { method: "DELETE" });
    if (res.ok) setExisting((prev) => prev.filter((p) => p.handle !== handle));
  }

  const [editingHandle, setEditingHandle] = useState<string | null>(null);
  const [editOffers, setEditOffers] = useState<Offer[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "error">("idle");

  const [editingProductHandle, setEditingProductHandle] = useState<string | null>(null);
  const [editProductForm, setEditProductForm] = useState<Product | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  function toggleSelected(handle: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer ${selected.size} produit(s) sélectionné(s) ?`)) return;
    setBulkDeleting(true);
    for (const handle of Array.from(selected)) {
      await fetch(`/api/products/${handle}`, { method: "DELETE" });
    }
    setExisting((prev) => prev.filter((p) => !selected.has(p.handle)));
    setSelected(new Set());
    setBulkDeleting(false);
  }

  function startEditProduct(p: Product) {
    setEditingProductHandle(p.handle);
    setEditProductForm({ ...p });
    setEditingHandle(null);
    setSaveStatus("idle");
  }

  function updateEditField(field: keyof Product, value: string) {
    setEditProductForm((prev) => (prev ? { ...prev, [field]: field === "price" || field === "oldPrice" ? parseInt(value, 10) || 0 : value } : prev));
  }

  async function saveEditProduct() {
    if (!editProductForm) return;
    setSaveStatus("loading");
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [editProductForm] }),
      });
      if (!res.ok) throw new Error("failed");
      setExisting((prev) => prev.map((x) => (x.handle === editProductForm.handle ? editProductForm : x)));
      setEditingProductHandle(null);
    } catch {
      setSaveStatus("error");
    }
  }

  function startEditOffers(p: Product) {
    setEditingHandle(p.handle);
    setEditOffers(p.offers && p.offers.length > 0 ? [...p.offers] : [{ qty: 1, price: p.price }]);
    setEditingProductHandle(null);
    setSaveStatus("idle");
  }

  function updateOfferRow(i: number, field: "qty" | "price", value: string) {
    setEditOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: parseInt(value, 10) || 0 } : o)));
  }

  function addOfferRow() {
    setEditOffers((prev) => [...prev, { qty: prev.length + 1, price: 0 }]);
  }

  function removeOfferRow(i: number) {
    setEditOffers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveOffers(p: Product) {
    setSaveStatus("loading");
    const validOffers = editOffers.filter((o) => o.qty > 0 && o.price > 0);
    const updated: Product = { ...p, offers: validOffers.length > 0 ? validOffers : undefined };
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [updated] }),
      });
      if (!res.ok) throw new Error("failed");
      setExisting((prev) => prev.map((x) => (x.handle === p.handle ? updated : x)));
      setEditingHandle(null);
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>📦 Catalogue produits</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
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

      {selected.size > 0 && (
        <div style={{ background: "#fff3f3", border: "1px solid #e63946", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{selected.size} produit(s) sélectionné(s)</span>
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            style={{ background: "#e63946", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
          >
            {bulkDeleting ? "Suppression..." : "🗑️ Supprimer la sélection"}
          </button>
        </div>
      )}

      {existing.length === 0 && <p>Aucun produit importé pour l&apos;instant.</p>}
      {existing.map((p) => (
        <div key={p.handle} style={{ border: "1px solid #eee", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                checked={selected.has(p.handle)}
                onChange={() => toggleSelected(p.handle)}
                style={{ marginTop: 4 }}
              />
              <div>
                <b>{p.name}</b> — {p.price.toLocaleString("fr-FR")} FCFA
                {p.offers && p.offers.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: "0.8em", color: "#2a9d8f" }}>
                    ({p.offers.length} offre{p.offers.length > 1 ? "s" : ""})
                  </span>
                )}
                <br />
                <Link href={`/produit/${p.handle}`} style={{ fontSize: "0.85em" }}>/produit/{p.handle} →</Link>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => (editingProductHandle === p.handle ? setEditingProductHandle(null) : startEditProduct(p))}
                style={{ background: "#6b3fa0", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "0.9em" }}
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => (editingHandle === p.handle ? setEditingHandle(null) : startEditOffers(p))}
                style={{ background: "#f4841c", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "0.9em" }}
              >
                {p.offers && p.offers.length > 0 ? "Modifier les offres" : "➕ Offres"}
              </button>
              <button
                onClick={() => removeProduct(p.handle)}
                style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer" }}
              >
                🗑️
              </button>
            </div>
          </div>

          {editingProductHandle === p.handle && editProductForm && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee" }}>
              <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Nom</p>
              <input
                value={editProductForm.name}
                onChange={(e) => updateEditField("name", e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 10, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Prix (FCFA)</p>
                  <input
                    type="number"
                    value={editProductForm.price || ""}
                    onChange={(e) => updateEditField("price", e.target.value)}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 10, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Prix barré (FCFA)</p>
                  <input
                    type="number"
                    value={editProductForm.oldPrice || ""}
                    onChange={(e) => updateEditField("oldPrice", e.target.value)}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 10, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Image (nom de fichier ou URL complète)</p>
              <input
                value={editProductForm.image}
                onChange={(e) => updateEditField("image", e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 10, boxSizing: "border-box" }}
              />
              <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Description</p>
              <textarea
                value={editProductForm.description}
                onChange={(e) => updateEditField("description", e.target.value)}
                rows={4}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 12, boxSizing: "border-box" }}
              />
              <button
                onClick={saveEditProduct}
                disabled={saveStatus === "loading"}
                style={{ background: "#2a9d8f", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
              >
                {saveStatus === "loading" ? "Enregistrement..." : "✅ Enregistrer"}
              </button>
              {saveStatus === "error" && <p style={{ color: "#e63946" }}>Erreur lors de l&apos;enregistrement.</p>}
            </div>
          )}

          {editingHandle === p.handle && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee" }}>
              <p style={{ fontSize: "0.9em", color: "#666", marginBottom: 10 }}>
                Quantité et prix pour chaque offre (ex: 1 → prix normal, 2 → prix réduit pour 2, etc.)
              </p>
              {editOffers.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <input
                    type="number"
                    value={o.qty || ""}
                    onChange={(e) => updateOfferRow(i, "qty", e.target.value)}
                    placeholder="Qté"
                    style={{ width: 70, padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
                  />
                  <span>×</span>
                  <input
                    type="number"
                    value={o.price || ""}
                    onChange={(e) => updateOfferRow(i, "price", e.target.value)}
                    placeholder="Prix FCFA"
                    style={{ width: 120, padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
                  />
                  <span style={{ fontSize: "0.85em", color: "#666" }}>FCFA</span>
                  <button onClick={() => removeOfferRow(i)} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", marginLeft: "auto" }}>
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addOfferRow}
                style={{ background: "none", border: "1px dashed #999", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "0.85em", marginBottom: 12 }}
              >
                + Ajouter une ligne
              </button>
              <br />
              <button
                onClick={() => saveOffers(p)}
                disabled={saveStatus === "loading"}
                style={{ background: "#2a9d8f", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
              >
                {saveStatus === "loading" ? "Enregistrement..." : "✅ Enregistrer"}
              </button>
              {saveStatus === "error" && <p style={{ color: "#e63946" }}>Erreur lors de l&apos;enregistrement.</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
