import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { DEFAULT_TENANT_ID } from "@/lib/products";

// ---------------------------------------------------------------------
// TENANT PUBLIC (catalogue en lecture seule, création de commande)
//
// Ces routes ne demandent pas de connexion (un client qui commande n'a
// pas de compte). Tant qu'il n'existe qu'un seul vrai marchand, on
// retombe sur le tenant par défaut.
// ---------------------------------------------------------------------
export function resolvePublicTenantId(req: NextRequest): string {
  const fromHeader = req.headers.get("x-tenant-id");
  return fromHeader && fromHeader.trim() ? fromHeader.trim() : DEFAULT_TENANT_ID;
}

// ---------------------------------------------------------------------
// TENANT ADMIN (dashboard commandes, gestion du catalogue)
//
// IMPORTANT — état actuel (un seul vrai marchand) :
// On vérifie bien qu'une vraie session Auth.js existe (donc /admin reste
// protégé par un vrai compte + mot de passe), MAIS on fait travailler ce
// compte sur le même espace de données "default" que les pages publiques
// (catalogue, commandes). Si on utilisait ici l'identifiant réel du
// compte connecté, les commandes créées depuis les pages publiques
// (qui ne savent pas encore à quel marchand elles appartiennent, faute
// de sous-domaine par marchand) n'apparaîtraient jamais dans l'admin
// du bon compte — c'est exactement le bug qui vient d'être observé.
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
