"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/kv";

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
    const res = await fetch("/api/orders", { headers: { "x-admin-secret": s } });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
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
        style={{ background: "#f4841c", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontWeight: "bold", marginBottom: 20, cursor: "pointer" }}
      >
        🔔 Activer les notifications sur cet appareil
      </button>
      {notifStatus === "on" && <p style={{ color: "#2a9d8f" }}>Notifications activées ✅</p>}
      {notifStatus === "error" && <p style={{ color: "#e63946" }}>Erreur lors de l&apos;activation.</p>}

      {orders.length === 0 && <p>Aucune commande pour l&apos;instant.</p>}

      {orders.map((o) => (
        <div key={o.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: "bold" }}>{o.name} — {o.phone}</div>
          <div>{o.product} · {o.price.toLocaleString("fr-FR")} FCFA</div>
          <div>{o.address}</div>
          <div>📅 {o.day} · 🕐 {o.time}</div>
          <div style={{ color: "#999", fontSize: "0.85em" }}>{new Date(o.createdAt).toLocaleString("fr-FR")}</div>
          <a href={`tel:${o.phone}`} style={{ marginRight: 12 }}>📞 Appeler</a>
          <a href={`https://wa.me/${o.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
        </div>
      ))}
    </div>
  );
}
