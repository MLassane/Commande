"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Order } from "@/lib/kv";
import AdminNav from "@/components/AdminNav";

type Period = "today" | "7days" | "30days";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  "7days": "7 derniers jours",
  "30days": "30 derniers jours",
};

// Page d'accueil de l'admin — vue d'ensemble façon Shopify (ventes,
// commandes, graphique, ce qu'il reste à traiter). La liste détaillée des
// commandes avec filtres/statuts reste sur /admin/commandes (rien n'a été
// supprimé, juste réorganisé).
export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");
  const [visits, setVisits] = useState<number | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  // On recharge le nombre de visites à chaque changement de période
  // (Aujourd'hui / 7 jours / 30 jours) — voir /api/stats/visits.
  useEffect(() => {
    setVisitsLoading(true);
    fetch(`/api/stats/visits?period=${period}`)
      .then((res) => (res.ok ? res.json() : { visits: 0 }))
      .then((data) => setVisits(data.visits ?? 0))
      .finally(() => setVisitsLoading(false));
  }, [period]);

  // Commandes qui tombent dans la période choisie (Aujourd'hui / 7j / 30j).
  const periodOrders = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      const diffDays = (now - new Date(o.createdAt).getTime()) / 86400000;
      if (period === "today") return diffDays <= 1;
      if (period === "7days") return diffDays <= 7;
      return diffDays <= 30;
    });
  }, [orders, period]);

  const stats = useMemo(() => {
    const commandes = periodOrders.length;
    const ventes = periodOrders
      .filter((o) => o.status !== "annulee")
      .reduce((sum, o) => sum + o.price * (o.qty || 1), 0);
    // "À traiter" = en attente, toutes périodes confondues (comme le
    // compteur "Commandes à traiter" de Shopify, qui ignore la période).
    const aTraiter = orders.filter((o) => o.status === "en_attente").length;
    return { commandes, ventes, aTraiter };
  }, [periodOrders, orders]);

  // Données du graphique : par heure si "Aujourd'hui", sinon par jour.
  const chartData = useMemo(() => {
    if (period === "today") {
      const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, commandes: 0 }));
      for (const o of periodOrders) {
        const h = new Date(o.createdAt).getHours();
        buckets[h].commandes++;
      }
      return buckets;
    }
    const days = period === "7days" ? 7 : 30;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return { label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), key: d.toDateString(), commandes: 0 };
    });
    for (const o of periodOrders) {
      const key = new Date(o.createdAt).toDateString();
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.commandes++;
    }
    return buckets;
  }, [periodOrders, period]);

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <AdminNav />
      <h1 style={{ marginBottom: 20 }}>📊 Aperçu de la boutique</h1>

      {/* --- Sélecteur de période --- */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              background: period === p ? "#6b3fa0" : "#f0f0f0",
              color: period === p ? "#fff" : "#333",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: period === p ? "bold" : "normal",
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          {/* --- Stats principales (façon Shopify : Visites / Ventes / Commandes) --- */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#f7f7f7", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: "0.85em", color: "#666" }}>Visites</div>
              <div style={{ fontSize: "1.6em", fontWeight: "bold" }}>{visitsLoading ? "…" : visits}</div>
            </div>
            <div style={{ background: "#f7f7f7", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: "0.85em", color: "#666" }}>Ventes totales</div>
              <div style={{ fontSize: "1.6em", fontWeight: "bold" }}>{stats.ventes.toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div style={{ background: "#f7f7f7", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: "0.85em", color: "#666" }}>Commandes</div>
              <div style={{ fontSize: "1.6em", fontWeight: "bold" }}>{stats.commandes}</div>
            </div>
          </div>

          {/* --- Graphique commandes dans le temps --- */}
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 8px 8px", marginBottom: 24 }}>
            <div style={{ padding: "0 8px", marginBottom: 8, fontWeight: "bold" }}>Commandes</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCommandes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b3fa0" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6b3fa0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip formatter={(value: number) => [value, "Commandes"]} />
                <Area type="monotone" dataKey="commandes" stroke="#6b3fa0" strokeWidth={2} fill="url(#colorCommandes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* --- Tuile "à traiter", comme sur Shopify --- */}
          <Link
            href="/admin/commandes"
            style={{ textDecoration: "none", color: "inherit", display: "block", background: "#f7f7f7", borderRadius: 12, padding: 16, marginBottom: 12 }}
          >
            <div style={{ fontSize: "1.6em", fontWeight: "bold" }}>{stats.aTraiter}</div>
            <div style={{ color: "#666" }}>Commandes à traiter →</div>
          </Link>
        </>
      )}
    </div>
  );
}
