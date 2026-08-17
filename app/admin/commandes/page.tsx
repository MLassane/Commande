"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order, OrderStatus } from "@/lib/kv";
import { formatRelativeDate } from "@/lib/date";
import AdminNav from "@/components/AdminNav";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

// Libellés et couleurs affichés pour chaque statut de commande.
const STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  livree: "Livrée",
  annulee: "Annulée",
};
const STATUS_COLORS: Record<OrderStatus, string> = {
  en_attente: "#f4841c",
  confirmee: "#2a6dd1",
  livree: "#2a9d8f",
  annulee: "#e63946",
};

type DateFilter = "all" | "today" | "7days" | "30days";

// Plus besoin de gérer un mot de passe partagé ici : le middleware Auth.js
// (voir middleware.ts) bloque déjà l'accès à cette page si l'utilisateur
// n'est pas connecté, et redirige automatiquement vers /sign-in. Le
// fetch("/api/orders") ci-dessous envoie le cookie de session Auth.js
// automatiquement (même origine), donc pas besoin d'ajouter de header.
export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifStatus, setNotifStatus] = useState<"idle" | "on" | "error">("idle");

  // --- Filtres ---
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const res = await fetch("/api/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
  }

  async function removeOrder(id: string) {
    if (!confirm("Supprimer cette commande ?")) return;
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      alert("Erreur lors de la suppression.");
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    // Mise à jour optimiste : on change l'affichage tout de suite, et on
    // revient en arrière si la requête échoue.
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setOrders(previous);
      alert("Erreur lors du changement de statut.");
    }
  }

  function exportCSV() {
    if (filteredOrders.length === 0) {
      alert("Aucune commande à exporter.");
      return;
    }
    const headers = ["N° Commande", "Statut", "Nom", "Téléphone", "Adresse", "Produit", "Prix (FCFA)", "Jour de livraison", "Heure de livraison", "Date de commande"];
    const rows = filteredOrders.map((o) => [
      o.orderNumber || "—",
      STATUS_LABELS[o.status],
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

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Liste des produits distincts présents dans les commandes, pour remplir
  // le menu déroulant du filtre produit.
  const productOptions = useMemo(() => {
    const set = new Set(orders.map((o) => o.product));
    return Array.from(set).sort();
  }, [orders]);

  // Commandes après application des 3 filtres (statut, produit, date).
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (productFilter !== "all" && o.product !== productFilter) return false;
      if (dateFilter !== "all") {
        const orderTime = new Date(o.createdAt).getTime();
        const diffDays = (now - orderTime) / (1000 * 60 * 60 * 24);
        if (dateFilter === "today" && diffDays > 1) return false;
        if (dateFilter === "7days" && diffDays > 7) return false;
        if (dateFilter === "30days" && diffDays > 30) return false;
      }
      return true;
    });
  }, [orders, statusFilter, productFilter, dateFilter]);

  // Stats calculées sur les commandes filtrées, pour que les chiffres
  // affichés correspondent toujours à ce que l'utilisateur regarde.
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const revenue = filteredOrders
      .filter((o) => o.status !== "annulee")
      .reduce((sum, o) => sum + o.price * (o.qty || 1), 0);
    const byStatus: Record<OrderStatus, number> = { en_attente: 0, confirmee: 0, livree: 0, annulee: 0 };
    for (const o of filteredOrders) byStatus[o.status]++;
    return { total, revenue, byStatus };
  }, [filteredOrders]);

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <AdminNav />
      <h1>📋 Commandes reçues</h1>

      {/* --- Bloc statistiques --- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, margin: "16px 0 24px" }}>
        <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: "0.8em", color: "#666" }}>Commandes</div>
          <div style={{ fontSize: "1.4em", fontWeight: "bold" }}>{stats.total}</div>
        </div>
        <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: "0.8em", color: "#666" }}>Revenu (hors annulées)</div>
          <div style={{ fontSize: "1.4em", fontWeight: "bold" }}>{stats.revenue.toLocaleString("fr-FR")} FCFA</div>
        </div>
        <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: "0.8em", color: "#666" }}>En attente</div>
          <div style={{ fontSize: "1.4em", fontWeight: "bold", color: STATUS_COLORS.en_attente }}>{stats.byStatus.en_attente}</div>
        </div>
        <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: "0.8em", color: "#666" }}>Livrées</div>
          <div style={{ fontSize: "1.4em", fontWeight: "bold", color: STATUS_COLORS.livree }}>{stats.byStatus.livree}</div>
        </div>
      </div>

      {/* --- Filtres --- */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">Tous les produits</option>
          {productOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">Toutes les dates</option>
          <option value="today">Aujourd&apos;hui</option>
          <option value="7days">7 derniers jours</option>
          <option value="30days">30 derniers jours</option>
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={enableNotifications}
          style={{ background: "#f4841c", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontWeight: "bold", marginBottom: 10, marginRight: 10, cursor: "pointer" }}
        >
          🔔 Activer les notifications sur cet appareil
        </button>

        <button
          onClick={exportCSV}
          style={{ background: "#2a9d8f", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
        >
          📥 Exporter en CSV
        </button>
        {notifStatus === "on" && <p style={{ color: "#2a9d8f" }}>Notifications activées ✅</p>}
        {notifStatus === "error" && <p style={{ color: "#e63946" }}>Erreur lors de l&apos;activation.</p>}
      </div>

      {filteredOrders.length === 0 && <p>Aucune commande ne correspond à ces filtres.</p>}

      {filteredOrders.map((o) => (
        <div key={o.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontWeight: "bold" }}>
              {o.orderNumber && <span style={{ color: "#6b3fa0" }}>{o.orderNumber} — </span>}
              {o.name} — {o.phone}
            </div>
            {/* Sélecteur de statut : change directement la commande sans recharger la page. */}
            <select
              value={o.status}
              onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
              style={{ background: STATUS_COLORS[o.status], color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontWeight: "bold", cursor: "pointer" }}
            >
              {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                <option key={s} value={s} style={{ color: "#000", background: "#fff" }}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>{o.product} · {o.price.toLocaleString("fr-FR")} FCFA</div>
          <div>{o.address}</div>
          <div>📅 {o.day} · 🕐 {o.time}</div>
          <div style={{ color: "#999", fontSize: "0.85em" }}>{formatRelativeDate(o.createdAt)}</div>
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
