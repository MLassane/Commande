import { auth } from "@/auth";
import { DEFAULT_TENANT_ID } from "@/lib/products";

// ---------------------------------------------------------------------
// TENANT ADMIN (dashboard commandes, gestion du catalogue)
//
// Ce fichier importe la config Auth.js complète (@/auth, qui inclut le
// provider Credentials + bcrypt) — il est donc réservé aux routes API
// (Node.js runtime), JAMAIS au middleware (Edge Runtime). Pour la
// résolution de tenant côté public/middleware, voir lib/tenant.ts.
//
// IMPORTANT — état actuel (un seul vrai marchand) :
// On vérifie bien qu'une vraie session Auth.js existe (donc /admin reste
// protégé par un vrai compte + mot de passe), MAIS on fait travailler ce
// compte sur le même espace de données "default" que les pages publiques
// (catalogue, commandes). Si on utilisait ici l'identifiant réel du
// compte connecté, les commandes créées depuis les pages publiques
// (qui ne savent pas encore à quel marchand elles appartiennent, faute
// de sous-domaine par marchand) n'apparaîtraient jamais dans l'admin
// du bon compte.
//
// À REVOIR le jour où un deuxième vrai marchand est onboardé : il faudra
// alors router les pages publiques par sous-domaine (ex.
// client2.tondomaine.com) pour qu'elles sachent résoudre le bon tenant,
// et à ce moment-là seulement faire dépendre le tenantId admin de
// l'identifiant du compte connecté plutôt que de DEFAULT_TENANT_ID.
// ---------------------------------------------------------------------
export async function requireAdminTenantId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new Error("unauthorized: no session found");
  }
  return DEFAULT_TENANT_ID;
}
