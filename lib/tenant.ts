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
// Pour les routes protégées par le middleware Auth.js (voir middleware.ts),
// le tenantId est l'identifiant du compte connecté — chaque marchand qui
// s'inscrit via /sign-up obtient automatiquement son propre espace de
// données, sans configuration supplémentaire.
//
// Le middleware garantit déjà qu'un utilisateur non connecté ne peut pas
// atteindre ces routes, mais on revérifie ici par sécurité (défense en
// profondeur).
// ---------------------------------------------------------------------
export async function requireAdminTenantId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new Error("unauthorized: no session found");
  }
  return userId;
}
