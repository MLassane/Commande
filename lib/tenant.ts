import { NextRequest } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/products";

// ---------------------------------------------------------------------
// TENANT PUBLIC (catalogue en lecture seule, création de commande)
//
// Ces routes ne demandent pas de connexion (un client qui commande n'a
// pas de compte). Tant qu'il n'existe qu'un seul vrai marchand, on
// retombe sur le tenant par défaut.
//
// IMPORTANT : ce fichier est importé par middleware.ts (Edge Runtime) —
// il ne doit donc importer AUCUNE dépendance lourde (bcrypt, next-auth
// avec provider Credentials, etc.), sous peine de faire planter le
// middleware au déploiement. La fonction requireAdminTenantId(), qui a
// besoin de session Auth.js + bcrypt, vit volontairement dans un fichier
// séparé : lib/admin-tenant.ts, jamais importé par le middleware.
// ---------------------------------------------------------------------
export function resolvePublicTenantId(req: NextRequest): string {
  const fromHeader = req.headers.get("x-tenant-id");
  return fromHeader && fromHeader.trim() ? fromHeader.trim() : DEFAULT_TENANT_ID;
}
