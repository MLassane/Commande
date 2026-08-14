import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes qui nécessitent d'être connecté :
// - /admin et /admin/produits : les pages elles-mêmes (dashboard, catalogue)
// - les routes API utilisées uniquement par l'admin pour créer/modifier/
//   supprimer des produits ou consulter/supprimer des commandes.
// Les routes publiques (catalogue en lecture seule, création de commande
// par un client) ne sont volontairement PAS dans cette liste.
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/products/import(.*)",
  "/api/orders(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    // auth().protect() redirige automatiquement vers la page de connexion
    // si l'utilisateur n'est pas authentifié (pour les pages), ou renvoie
    // une 401 (pour les routes API).
    auth().protect();
  }
});

export const config = {
  // Le middleware s'exécute sur toutes les routes sauf les fichiers
  // statiques (images, css, etc.) et les fichiers internes de Next.js.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv)).*)",
    "/(api|trpc)(.*)",
  ],
};
