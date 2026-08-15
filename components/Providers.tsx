"use client";

import { SessionProvider } from "next-auth/react";

// SessionProvider doit être un composant client — il ne peut pas être
// utilisé directement dans app/layout.tsx (qui est un composant serveur
// par défaut). Ce petit wrapper sert uniquement à ça.
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
