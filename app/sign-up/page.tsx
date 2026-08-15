"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

// Page d'inscription — c'est ici qu'un futur marchand externe créera son
// compte pour obtenir son propre espace (catalogue + commandes séparés,
// voir lib/tenant.ts).
export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      if (data.error === "email_already_used") setError("Cet email a déjà un compte.");
      else if (data.error === "password_too_short") setError("Le mot de passe doit faire au moins 8 caractères.");
      else setError("Erreur lors de la création du compte.");
      return;
    }

    // Compte créé : on connecte directement l'utilisateur, pas besoin de
    // repasser par /sign-in.
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/sign-in");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h2>Créer un compte marchand</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 10, boxSizing: "border-box" }}
        />
        <input
          type="password"
          placeholder="Mot de passe (8 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ width: "100%", padding: 10, marginBottom: 10, boxSizing: "border-box" }}
        />
        {error && <p style={{ color: "#e63946" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10, cursor: "pointer" }}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: "0.9em" }}>
        Déjà un compte ? <Link href="/sign-in">Se connecter</Link>
      </p>
    </div>
  );
}
