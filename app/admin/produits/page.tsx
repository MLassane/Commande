"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseCSV } from "@/lib/csv";
import type { Product, Offer } from "@/lib/products";
import { textToHtml, looksLikeHtml } from "@/lib/richtext";
import RichTextEditor from "@/components/RichTextEditor";
import ImageUploadButton from "@/components/ImageUploadButton";
import AdminNav from "@/components/AdminNav";

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
  // Le tenantId réel est toujours réappliqué côté serveur, à partir de la
  // session connectée (voir requireAdminTenantId() dans lib/tenant.ts) —
  // impossible de tricher en envoyant un tenantId différent depuis le
  // navigateur. La valeur ci-dessous n'est qu'un placeholder pour
  // satisfaire le typage de Product côté client.
  const [preview, setPreview] = useState<Product[]>([]);
  const [existing, setExisting] = useState<Product[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");
  // Mode d'édition de la description : "text" (simple, converti
  // automatiquement en HTML propre à l'enregistrement) ou "html" (source
  // brute, comme le bouton </> de Shopify).
  const [descMode, setDescMode] = useState<"text" | "visual" | "html">("visual");

  useEffect(() => {
    fetchExisting();
  }, []);

  async function fetchExisting() {
    // Le cookie de session Auth.js est envoyé automatiquement (même origine) ;
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
            tenantId: "",
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

  // Sentinelle utilisée dans editingProductHandle pour distinguer "en train
  // de créer un nouveau produit" d'un vrai handle existant.
  const NEW_PRODUCT_SENTINEL = "__new__";

  function startNewProduct() {
    setEditingProductHandle(NEW_PRODUCT_SENTINEL);
    setEditProductForm({ handle: "", tenantId: "", name: "", price: 0, oldPrice: 0, image: "", description: "" });
    setEditingHandle(null);
    setSaveStatus("idle");
    setEditErrorMsg("");
    setDescMode("visual"); // un nouveau produit démarre dans l'éditeur visuel, comme sur Shopify
  }

  function startEditProduct(p: Product) {
    setEditingProductHandle(p.handle);
    setEditProductForm({ ...p });
    setEditingHandle(null);
    setSaveStatus("idle");
    setEditErrorMsg("");
    // Pré-sélectionne le mode selon le contenu déjà enregistré : du texte
    // pur (sans aucune balise) s'ouvre en mode "Texte simple" ; tout le
    // reste (déjà du HTML) s'ouvre dans l'éditeur visuel, qui sait
    // afficher et modifier du HTML existant normalement.
    setDescMode(looksLikeHtml(p.description) ? "visual" : "text");
  }

  function updateEditField(field: keyof Product, value: string) {
    setEditProductForm((prev) => (prev ? { ...prev, [field]: field === "price" || field === "oldPrice" ? parseInt(value, 10) || 0 : value } : prev));
  }

  async function saveEditProduct() {
    if (!editProductForm) return;
    const isNew = editingProductHandle === NEW_PRODUCT_SENTINEL;
    setEditErrorMsg("");

    if (isNew) {
      const handle = editProductForm.handle.trim();
      if (!handle) {
        setEditErrorMsg("Le handle (identifiant dans l'URL) est obligatoire.");
        return;
      }
      if (!/^[a-z0-9-]+$/.test(handle)) {
        setEditErrorMsg("Le handle ne doit contenir que des lettres minuscules, chiffres et tirets (ex: massage-stick).");
        return;
      }
      if (existing.some((x) => x.handle === handle)) {
        setEditErrorMsg("Un produit avec ce handle existe déjà.");
        return;
      }
    }

    setSaveStatus("loading");
    try {
      // En mode "Texte simple", on convertit en HTML propre juste avant
      // l'enregistrement (paragraphes + sauts de ligne), car la page
      // produit publique affiche toujours product.description comme du
      // HTML (voir app/produit/[handle]/page.tsx).
      const finalDescription = descMode === "text" ? textToHtml(editProductForm.description) : editProductForm.description;
      const toSave: Product = { ...editProductForm, handle: editProductForm.handle.trim(), description: finalDescription };

      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [toSave] }),
      });
      if (!res.ok) throw new Error("failed");
      if (isNew) {
        setExisting((prev) => [...prev, toSave]);
      } else {
        setExisting((prev) => prev.map((x) => (x.handle === toSave.handle ? toSave : x)));
      }
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
      <AdminNav />
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Produits déjà en ligne ({existing.length})</h2>
        {editingProductHandle !== NEW_PRODUCT_SENTINEL && (
          <button
            onClick={startNewProduct}
            style={{ background: "#6b3fa0", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
          >
            + Créer une page produit
          </button>
        )}
      </div>

      {/* --- Formulaire de création d'un nouveau produit --- */}
      {editingProductHandle === NEW_PRODUCT_SENTINEL && editProductForm && (
        <div style={{ border: "1px solid #6b3fa0", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Nouveau produit</h3>

          <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Handle (identifiant dans l&apos;URL, ex: massage-stick)</p>
          <input
            value={editProductForm.handle}
            onChange={(e) => updateEditField("handle", e.target.value.toLowerCase())}
            placeholder="massage-stick"
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 10, boxSizing: "border-box" }}
          />

          <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Titre</p>
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

          <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Image (nom de fichier, URL complète, ou importe depuis ton téléphone)</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={editProductForm.image}
              onChange={(e) => updateEditField("image", e.target.value)}
              style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 6, boxSizing: "border-box" }}
            />
            <ImageUploadButton label="📤 Importer" onUploaded={(url) => updateEditField("image", url)} />
          </div>
          {editProductForm.image && (
            <img
              src={editProductForm.image.startsWith("http") ? editProductForm.image : `/images/${editProductForm.image}`}
              alt="Aperçu"
              style={{ maxWidth: 140, maxHeight: 140, borderRadius: 8, marginBottom: 10, objectFit: "cover" }}
            />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: "0.85em", color: "#666", margin: 0 }}>
              {descMode === "text" && "Description — texte simple, sans balises. Les sauts de ligne sont conservés automatiquement."}
              {descMode === "visual" && "Description — éditeur visuel (mise en forme, couleurs, tableaux...)."}
              {descMode === "html" && "Description — colle ici le HTML de ta page produit (ex: la section Hero)."}
            </p>
            <div style={{ display: "flex", border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setDescMode("text")}
                style={{ padding: "4px 10px", fontSize: "0.8em", border: "none", cursor: "pointer", background: descMode === "text" ? "#6b3fa0" : "#fff", color: descMode === "text" ? "#fff" : "#333" }}
              >
                📝 Texte simple
              </button>
              <button
                type="button"
                onClick={() => setDescMode("visual")}
                style={{ padding: "4px 10px", fontSize: "0.8em", border: "none", cursor: "pointer", background: descMode === "visual" ? "#6b3fa0" : "#fff", color: descMode === "visual" ? "#fff" : "#333" }}
              >
                🎨 Éditeur visuel
              </button>
              <button
                type="button"
                onClick={() => setDescMode("html")}
                style={{ padding: "4px 10px", fontSize: "0.8em", border: "none", cursor: "pointer", background: descMode === "html" ? "#6b3fa0" : "#fff", color: descMode === "html" ? "#fff" : "#333" }}
              >
                {"</> HTML"}
              </button>
            </div>
          </div>

          {descMode === "visual" ? (
            <RichTextEditor value={editProductForm.description} onChange={(html) => updateEditField("description", html)} />
          ) : (
            <>
              <textarea
                value={editProductForm.description}
                onChange={(e) => updateEditField("description", e.target.value)}
                rows={6}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, boxSizing: "border-box", fontFamily: descMode === "html" ? "monospace" : "Arial", fontSize: descMode === "html" ? "0.85em" : "1em" }}
              />
              <p style={{ fontSize: "0.8em", color: "#999", marginBottom: 4 }}>Aperçu :</p>
              <iframe
                title="Aperçu de la description"
                srcDoc={
                  (descMode === "text" ? textToHtml(editProductForm.description) : editProductForm.description) ||
                  "<p style='color:#999;font-family:Arial'>Rien à prévisualiser pour l'instant.</p>"
                }
                sandbox=""
                style={{ width: "100%", height: 280, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}
              />
            </>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={saveEditProduct}
              disabled={saveStatus === "loading"}
              style={{ background: "#2a9d8f", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
            >
              {saveStatus === "loading" ? "Création..." : "✅ Créer le produit"}
            </button>
            <button
              onClick={() => setEditingProductHandle(null)}
              style={{ background: "none", border: "1px solid #ccc", padding: "10px 16px", borderRadius: 8, cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
          {editErrorMsg && <p style={{ color: "#e63946" }}>{editErrorMsg}</p>}
          {saveStatus === "error" && !editErrorMsg && <p style={{ color: "#e63946" }}>Erreur lors de la création.</p>}
        </div>
      )}

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
              <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Titre</p>
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
              <p style={{ fontSize: "0.85em", color: "#666", marginBottom: 4 }}>Image (nom de fichier, URL complète, ou importe depuis ton téléphone)</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  value={editProductForm.image}
                  onChange={(e) => updateEditField("image", e.target.value)}
                  style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 6, boxSizing: "border-box" }}
                />
                <ImageUploadButton label="📤 Importer" onUploaded={(url) => updateEditField("image", url)} />
              </div>
              {editProductForm.image && (
                <img
                  src={editProductForm.image.startsWith("http") ? editProductForm.image : `/images/${editProductForm.image}`}
                  alt="Aperçu"
                  style={{ maxWidth: 140, maxHeight: 140, borderRadius: 8, marginBottom: 10, objectFit: "cover" }}
                />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                <p style={{ fontSize: "0.85em", color: "#666", margin: 0 }}>
                  {descMode === "text" && "Description — texte simple, sans balises."}
                  {descMode === "visual" && "Description — éditeur visuel (mise en forme, couleurs, tableaux...)."}
                  {descMode === "html" && "Description — HTML (aperçu en direct ci-dessous)."}
                </p>
                <div style={{ display: "flex", border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setDescMode("text")}
                    style={{ padding: "4px 10px", fontSize: "0.8em", border: "none", cursor: "pointer", background: descMode === "text" ? "#6b3fa0" : "#fff", color: descMode === "text" ? "#fff" : "#333" }}
                  >
                    📝 Texte simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescMode("visual")}
                    style={{ padding: "4px 10px", fontSize: "0.8em", border: "none", cursor: "pointer", background: descMode === "visual" ? "#6b3fa0" : "#fff", color: descMode === "visual" ? "#fff" : "#333" }}
                  >
                    🎨 Éditeur visuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescMode("html")}
                    style={{ padding: "4px 10px", fontSize: "0.8em", border: "none", cursor: "pointer", background: descMode === "html" ? "#6b3fa0" : "#fff", color: descMode === "html" ? "#fff" : "#333" }}
                  >
                    {"</> HTML"}
                  </button>
                </div>
              </div>

              {descMode === "visual" ? (
                <RichTextEditor value={editProductForm.description} onChange={(html) => updateEditField("description", html)} />
              ) : (
                <>
                  <textarea
                    value={editProductForm.description}
                    onChange={(e) => updateEditField("description", e.target.value)}
                    rows={6}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, boxSizing: "border-box", fontFamily: descMode === "html" ? "monospace" : "Arial", fontSize: descMode === "html" ? "0.85em" : "1em" }}
                  />
                  <p style={{ fontSize: "0.8em", color: "#999", marginBottom: 4 }}>Aperçu :</p>
                  <iframe
                    title="Aperçu de la description"
                    srcDoc={
                      (descMode === "text" ? textToHtml(editProductForm.description) : editProductForm.description) ||
                      "<p style='color:#999;font-family:Arial'>Rien à prévisualiser pour l'instant.</p>"
                    }
                    sandbox=""
                    style={{ width: "100%", height: 280, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}
                  />
                </>
              )}
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
