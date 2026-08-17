"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "/admin", label: "📊 Aperçu" },
  { href: "/admin/commandes", label: "📋 Commandes" },
  { href: "/admin/produits", label: "📦 Produits" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                textDecoration: "none",
                color: active ? "#fff" : "#333",
                background: active ? "#6b3fa0" : "#f0f0f0",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: "0.95em",
                fontWeight: active ? "bold" : "normal",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/sign-in" })}
        style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}
      >
        Se déconnecter
      </button>
    </div>
  );
}
