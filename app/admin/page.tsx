"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/kv";
import { DEFAULT_TENANT_ID } from "@/lib/products";

// Tenant courant de ce dashboard. Codé en dur en attendant la vraie
// authentification multi-comptes (voir même remarque dans admin/produits).
const ADMIN_TENANT_ID = DEFAULT_TENANT_ID;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifStatus, setNotifStatus] = useState<"idle" | "on" | "error">("idle");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_secret");
    if (saved) {
      setSecret(saved);
      setUnlocked(true);
      fetchOrders(saved);
    }
  }, []);

  async function fetchOrders(s: string) {
    // On précise le tenant courant pour ne récupérer que ses commandes.
    const res = await fetch("/api/orders", { headers: { "x-admin-secret": s, "x-tenant-id": ADMIN_TENANT_ID } });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
  }

  async function removeOrder(id: string) {
    if (!confirm("Supprimer cette commande ?")) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret, "x-tenant-id": ADMIN_TENANT_ID },
    });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      alert("Erreur lors de la suppression.");
    }
  }

  function exportCSV() {
    if (orders.length === 0) {
      alert("Aucune commande à exporter.");
      return;
    }
    const headers = ["N° Commande", "Nom", "Téléphone", "Adresse", "Produit", "Prix (FCFA)", "Jour de livraison", "Heure de livraison", "Date de commande"];
    const rows = orders.map((o) => [
      o.orderNumber || "—",
      o.name,
      o.phone,
      o.address,
      o.product,
      o.price.toString(),
      o.day,
      o.time,
      new Date(o.createdAt).toLocaleString("fr-FR"),
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(";")).join("\n");

    // Le "\uFEFF" au début permet à Excel d'afficher correctement les accents
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function login() {
    sessionStorage.setItem("admin_secret", secret);
    setUnlocked(true);
    fetchOrders(secret);
  }

  async function enableNotifications() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Ton navigateur ne supporte pas les notifications push.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Tu dois autoriser les notifications pour continuer.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setNotifStatus("on");
    } catch (e) {
      console.error(e);
      setNotifStatus("error");
    }
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
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h1>📋 Commandes reçues</h1>

      <button
        onClick={enableNotifications}
        style={{ background: "#f4841c", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontWeight: "bold", marginBottom: 10, marginRight: 10, cursor: "pointer" }}
      >
        🔔 Activer les notifications sur cet appareil
      </button>

      <button
        onClick={exportCSV}
        style={{ background: "#2a9d8f", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontWeight: "bold", marginBottom: 20, cursor: "pointer" }}
      >
        📥 Exporter en CSV
      </button>
      {notifStatus === "on" && <p style={{ color: "#2a9d8f" }}>Notifications activées ✅</p>}
      {notifStatus === "error" && <p style={{ color: "#e63946" }}>Erreur lors de l&apos;activation.</p>}

      {orders.length === 0 && <p>Aucune commande pour l&apos;instant.</p>}

      {orders.map((o) => (
        <div key={o.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: "bold" }}>
            {o.orderNumber && <span style={{ color: "#6b3fa0" }}>{o.orderNumber} — </span>}
            {o.name} — {o.phone}
          </div>
          <div>{o.product} · {o.price.toLocaleString("fr-FR")} FCFA</div>
          <div>{o.address}</div>
          <div>📅 {o.day} · 🕐 {o.time}</div>
          <div style={{ color: "#999", fontSize: "0.85em" }}>{new Date(o.createdAt).toLocaleString("fr-FR")}</div>
          <a href={`tel:${o.phone}`} style={{ marginRight: 12 }}>📞 Appeler</a>
          <a href={`https://wa.me/${o.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>💬 WhatsApp</a>
          <button
            onClick={() => removeOrder(o.id)}
            style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", padding: 0, fontSize: "1em" }}
          >
            🗑️ Supprimer
          </button>
        </div>
      ))}
    </div>
  );
}
