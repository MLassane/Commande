"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CountdownTimer from "@/components/CountdownTimer";
import { COUNTRIES, DEFAULT_COUNTRY, Country } from "@/lib/countries";
import { PRODUCT as DEFAULT_PRODUCT, OFFERS, WHATSAPP_NUMBER } from "@/lib/config";

type ActiveProduct = { name: string; price: number; oldPrice: number; currency: string };

export default function CommandePageWrapper() {
  return (
    <Suspense fallback={null}>
      <CommandePage />
    </Suspense>
  );
}

function CommandePage() {
  const searchParams = useSearchParams();
  const handle = searchParams.get("produit");

  const [product, setProduct] = useState<ActiveProduct>(DEFAULT_PRODUCT);

  useEffect(() => {
    if (!handle) {
      setProduct(DEFAULT_PRODUCT);
      return;
    }
    fetch(`/api/products/${handle}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.product) {
          setProduct({
            name: data.product.name,
            price: data.product.price,
            oldPrice: data.product.oldPrice,
            currency: "FCFA",
          });
        }
      })
      .catch(() => {});
  }, [handle]);

  const PRODUCT = product;

  // Les offres par quantité ne s'appliquent qu'au produit par défaut
  // (celui sans ?produit= dans l'URL, ex: page d'accueil Massage Stick).
  const hasOffers = !handle;
  const [offerIndex, setOfferIndex] = useState(0);
  const selectedOffer = OFFERS[offerIndex];
  const activeName = hasOffers ? `${PRODUCT.name} x${selectedOffer.qty}` : PRODUCT.name;
  const activePrice = hasOffers ? selectedOffer.price : PRODUCT.price;
  const activeQty = hasOffers ? selectedOffer.qty : 1;

  const [form, setForm] = useState({
    name: "",
    phone: "", // numéro local, sans indicatif
    address: "",
    day: "",
    time: "",
    confirmed: false,
  });
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [errors, setErrors] = useState<{ general?: string; phone?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Détecte le pays du visiteur pour pré-sélectionner le bon indicatif.
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const found = COUNTRIES.find((c) => c.code === data?.country_code);
        if (found) setCountry(found);
      })
      .catch(() => {
        // Si la détection échoue, on garde le pays par défaut (Niger).
      });
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function isValid() {
    const newErrors: { general?: string; phone?: string } = {};

    const phoneDigits = form.phone.replace(/[^\d]/g, "");
    if (phoneDigits.length !== country.digits) {
      newErrors.phone = `Au ${country.name}, le numéro doit comporter ${country.digits} chiffres (sans l'indicatif).`;
    }

    if (!form.name || !form.phone || !form.address || !form.day || !form.time) {
      newErrors.general = "Merci de remplir tous les champs.";
    } else if (!form.confirmed) {
      newErrors.general = "Merci de cocher la case de confirmation.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function fullPhone() {
    return `${country.dial} ${form.phone}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: fullPhone(), product: activeName, price: activePrice, qty: activeQty }),
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
      body: JSON.stringify({ ...form, phone: fullPhone(), product: activeName, price: activePrice, qty: activeQty }),
    }).catch(() => {});

    const message =
      `Bonjour, je souhaite commander :\n\n` +
      `🛍️ Produit : ${activeName}\n` +
      `💰 Prix : ${activePrice.toLocaleString("fr-FR")} ${PRODUCT.currency}\n\n` +
      `👤 Nom : ${form.name}\n` +
      `📞 Téléphone : ${fullPhone()}\n` +
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
          <p>Nous vous contacterons très vite au {fullPhone()} pour confirmer la livraison.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.banner}>Livraison gratuite</div>
      <div style={styles.card}>
        <h1 style={styles.title}>{PRODUCT.name}</h1>
        <CountdownTimer />
        <div style={styles.priceRow}>
          <span style={styles.oldPrice}>{PRODUCT.oldPrice.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
          <span style={styles.newPrice}>{activePrice.toLocaleString("fr-FR")} {PRODUCT.currency}</span>
        </div>

        {hasOffers && (
          <div style={{ marginBottom: 24 }}>
            {OFFERS.map((offer, i) => (
              <label
                key={offer.qty}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: i === offerIndex ? "2px solid #f4841c" : "1.5px solid #ddd",
                  background: i === offerIndex ? "#fff7f0" : "#fff",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 10,
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="radio" checked={i === offerIndex} onChange={() => setOfferIndex(i)} />
                  <span>
                    {offer.label}
                    {i === OFFERS.length - 1 && (
                      <span style={{ marginLeft: 8, background: "#2a9d8f", color: "#fff", fontSize: "0.75em", padding: "2px 8px", borderRadius: 20 }}>
                        Meilleure offre
                      </span>
                    )}
                  </span>
                </span>
                <b>{offer.price.toLocaleString("fr-FR")} FCFA</b>
              </label>
            ))}
          </div>
        )}

        <form onSubmit={submit}>
          <Field label="Nom et prénom" required>
            <input style={styles.input} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nom et prénom" />
          </Field>

          <Field label="Téléphone" required>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                style={{ ...styles.input, width: 110, flexShrink: 0 }}
                value={country.code}
                onChange={(e) => setCountry(COUNTRIES.find((c) => c.code === e.target.value) || DEFAULT_COUNTRY)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.dial} {c.name}</option>
                ))}
              </select>
              <input
                style={styles.input}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/[^\d]/g, ""))}
                placeholder={`${country.digits} chiffres`}
                type="tel"
                inputMode="numeric"
              />
            </div>
            {errors.phone && <p style={styles.fieldError}>{errors.phone}</p>}
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

          {errors.general && <p style={styles.generalError}>⚠️ {errors.general}</p>}

          <button type="submit" style={styles.cta} disabled={status === "loading"}>
            {status === "loading" ? "Envoi..." : `Je Commande - ${PRODUCT.currency}${activePrice.toLocaleString("fr-FR")}`}
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
  fieldError: { color: "#e63946", fontSize: "0.9em", marginTop: 6 },
  generalError: { background: "#fff3f3", border: "1px solid #e63946", color: "#e63946", borderRadius: 8, padding: "10px 14px", fontSize: "0.95em", marginBottom: 12 },
  cta: { display: "block", width: "100%", background: "#f4841c", color: "#fff", border: "none", padding: "18px", borderRadius: 10, fontSize: "1.15em", fontWeight: "bold", cursor: "pointer" },
  whatsappCta: { display: "block", width: "100%", background: "#25D366", color: "#fff", border: "none", padding: "18px", borderRadius: 10, fontSize: "1.15em", fontWeight: "bold", cursor: "pointer", marginTop: 12 },
};
