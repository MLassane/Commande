"use client";

import { useState } from "react";
import { PRODUCT, WHATSAPP_NUMBER } from "@/lib/config";

export default function CommandePage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    day: "",
    time: "",
    confirmed: false,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function isValid() {
    if (!form.name || !form.phone || !form.address || !form.day || !form.time) {
      alert("Merci de remplir tous les champs.");
      return false;
    }
    if (!form.confirmed) {
      alert("Merci de cocher la case de confirmation.");
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, product: PRODUCT.name, price: PRODUCT.price }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function orderViaWhatsApp() {
    if (!isValid()) return;

    // On enregistre aussi la commande côté site (pour qu'elle apparaisse
    // dans /admin et déclenche la notification), sans bloquer l'ouverture
    // de WhatsApp si ça échoue.
    fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, product: PRODUCT.name, price: PRODUCT.price }),
    }).catch(() => {});

    const message =
      `Bonjour, je souhaite commander :\n\n` +
      `🛍️ Produit : ${PRODUCT.name}\n` +
      `💰 Prix : ${PRODUCT.price.toLocaleString("fr-FR")} ${PRODUCT.currency}\n\n` +
      `👤 Nom : ${form.name}\n` +
      `📞 Téléphone : ${form.phone}\n` +
      `📍 Adresse : ${form.address}\n` +
      `📅 Jour de livraison : ${form.day}\n` +
      `🕐 Heure de livraison : ${form.time}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  if (status === "done") {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center" as const }}>
          <h2 style={{ color: "#2a9d8f" }}>✅ Commande reçue !</h2>
          <p>Nous vous contacterons très vite au {form.phone} pour confirmer la livraison.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.banner}>Livraison gratuite</div>
      <div style={styles.card}>
        <h1 style={styles.title}>{PRODUCT.name}</h1>
        <div style={styles.priceRow}>
          <span style={styles.oldPrice}>{PRODUCT.oldPrice.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
          <span style={styles.newPrice}>{PRODUCT.price.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
        </div>

        <form onSubmit={submit}>
          <Field label="Nom et prénom" required>
            <input style={styles.input} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nom et prénom" />
          </Field>

          <Field label="Téléphone" required>
            <input style={styles.input} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Téléphone" type="tel" />
          </Field>

          <Field label="Adresse de livraison" required>
            <input style={styles.input} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Adresse de livraison" />
          </Field>

          <Field label="Jour de livraison" required>
            <select style={styles.input} value={form.day} onChange={(e) => update("day", e.target.value)}>
              <option value="">Jour de livraison</option>
              <option value="Aujourd'hui">Aujourd&apos;hui</option>
              <option value="Demain">Demain</option>
              <option value="Cette semaine">Cette semaine</option>
            </select>
          </Field>

          <Field label="Heure de livraison" required>
            <input style={styles.input} value={form.time} onChange={(e) => update("time", e.target.value)} placeholder="Ex : 10h ou entre 13h et 15h" />
          </Field>

          <label style={styles.checkboxRow}>
            <input type="checkbox" checked={form.confirmed} onChange={(e) => update("confirmed", e.target.checked)} />
            <span>Je suis réellement intéressé(e) et prêt(e) à être livré(e)</span>
          </label>

          <p style={styles.warning}>
            Respectez-vous et validez votre commande uniquement si vous êtes prêt(e) à être livré(e).
          </p>

          <button type="submit" style={styles.cta} disabled={status === "loading"}>
            {status === "loading" ? "Envoi..." : `Je Commande - ${PRODUCT.currency}${PRODUCT.price.toLocaleString("fr-FR")}`}
          </button>

          <button type="button" onClick={orderViaWhatsApp} style={styles.whatsappCta}>
            💬 Commander sur WhatsApp
          </button>

          {status === "error" && <p style={{ color: "#e63946" }}>Une erreur est survenue, réessayez.</p>}
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: "#e63946" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  page: { background: "#f7f7f7", minHeight: "100vh" },
  banner: { background: "#f4841c", color: "#fff", textAlign: "center", padding: "10px 0", fontWeight: 600 },
  card: { maxWidth: 480, margin: "0 auto", background: "#fff", padding: "24px 20px 90px" },
  title: { fontSize: "1.6em", marginBottom: 6 },
  priceRow: { marginBottom: 24 },
  oldPrice: { textDecoration: "line-through", color: "#999", marginRight: 10 },
  newPrice: { color: "#e63946", fontWeight: "bold", fontSize: "1.3em" },
  label: { display: "block", fontWeight: 600, marginBottom: 8, fontSize: "1.05em" },
  input: { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 10, border: "1px solid #ddd", fontSize: "1em" },
  checkboxRow: { display: "flex", alignItems: "flex-start", gap: 10, margin: "10px 0 16px", fontSize: "1.05em" },
  warning: { color: "#e63946", fontStyle: "italic", fontSize: "0.95em" },
  cta: { display: "block", width: "100%", background: "#f4841c", color: "#fff", border: "none", padding: "18px", borderRadius: 10, fontSize: "1.15em", fontWeight: "bold", cursor: "pointer" },
  whatsappCta: { display: "block", width: "100%", background: "#25D366", color: "#fff", border: "none", padding: "18px", borderRadius: 10, fontSize: "1.15em", fontWeight: "bold", cursor: "pointer", marginTop: 12 },
};
