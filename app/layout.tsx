import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Commande",
  description: "Page de commande",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ClerkProvider donne accès à l'état de connexion (useUser, auth(),
    // middleware.ts) partout dans l'app — nécessaire pour que /admin et
    // les routes API protégées fonctionnent.
    <ClerkProvider>
      <html lang="fr">
        <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
