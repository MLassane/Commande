import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DEFAULT_TENANT_ID } from "@/lib/products";

// ---------------------------------------------------------------------
// TENANT PUBLIC (catalogue en lecture seule, création de commande)
//
// Ces routes ne demandent pas de connexion (un client qui commande n'a
// pas de compte). Tant qu'il n'existe qu'un seul vrai marchand, on
// retombe sur le tenant par défaut. Le jour où plusieurs marchands
// externes existeront, il faudra résoudre le tenant autrement pour ces
// routes publiques (sous-domaine par marchand, voir note dans
// lib/products.ts) — un header n'a plus de sens puisqu'il n'y a pas de
// panneau admin qui l'envoie côté client public.
// ---------------------------------------------------------------------
export function resolvePublicTenantId(req: NextRequest): string {
  const fromHeader = req.headers.get("x-tenant-id");
  return fromHeader && fromHeader.trim() ? fromHeader.trim() : DEFAULT_TENANT_ID;
}

// ---------------------------------------------------------------------
// TENANT ADMIN (dashboard commandes, gestion du catalogue)
//
// Pour les routes protégées par le middleware Clerk (voir middleware.ts),
// le tenantId est désormais l'identifiant Clerk de l'utilisateur connecté
// — chaque marchand qui crée un compte obtient automatiquement son propre
// espace de données, sans configuration supplémentaire.
//
// Le middleware garantit déjà qu'un utilisateur non connecté ne peut pas
// atteindre ces routes, mais on revérifie ici par sécurité (défense en
// profondeur) : si jamais cette fonction est appelée depuis une route que
// le middleware ne protège pas, on ne renvoie jamais un tenantId vide.
// ---------------------------------------------------------------------
export function requireAdminTenantId(): string {
  const { userId } = auth();
  if (!userId) {
    throw new Error("unauthorized: no Clerk session found");
  }
  return userId;
}
