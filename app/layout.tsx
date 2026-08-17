import Providers from "@/components/Providers";

export const metadata = {
  title: "Commande",
  description: "Page de commande",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Providers (SessionProvider d'Auth.js) donne accès à l'état de
    // connexion (useSession, signOut) partout dans l'app — nécessaire
    // pour /admin et le bouton de déconnexion.
    <Providers>
      <html lang="fr">
        <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>{children}</body>
      </html>
    </Providers>
  );
}
