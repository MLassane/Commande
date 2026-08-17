"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

// useSearchParams() (pour récupérer callbackUrl) doit être encapsulé dans
// un <Suspense>, sinon Next.js refuse de pré-générer cette page au build.
function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // signIn("credentials", ...) appelle le provider défini dans auth.ts,
    // qui vérifie l'email/mot de passe contre lib/users.ts (Redis).
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    // Une fois connecté, redirige vers la page demandée à l'origine
    // (ex: /admin), ou /admin par défaut.
    router.push(searchParams.get("callbackUrl") || "/admin");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h2>Connexion marchand</h2>
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
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 10, boxSizing: "border-box" }}
        />
        {error && <p style={{ color: "#e63946" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10, cursor: "pointer" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: "0.9em" }}>
        Pas encore de compte ? <Link href="/sign-up">Créer un compte</Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
