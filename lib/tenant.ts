import { NextRequest } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/products";

// ---------------------------------------------------------------------
// SOLUTION TEMPORAIRE — à remplacer quand la vraie authentification
// multi-comptes (Clerk ou Auth.js) sera branchée.
//
// Pour l'instant, il n'y a qu'un seul "vrai" marchand (toi), donc le
// tenantId est simplement lu dans un header "x-tenant-id" envoyé par
// l'admin (voir app/admin/produits/page.tsx), avec un repli sur le
// tenant par défaut si le header est absent. Ça permet au code d'être
// déjà écrit "multi-tenant" partout, sans bloquer sur l'auth tout de
// suite.
//
// Plus tard, cette fonction sera remplacée par la lecture du tenantId
// dans la session de l'utilisateur connecté (ex: `auth().userId` avec
// Clerk), et non plus dans un header envoyé par le client.
// ---------------------------------------------------------------------
export function resolveTenantId(req: NextRequest): string {
  const fromHeader = req.headers.get("x-tenant-id");
  return fromHeader && fromHeader.trim() ? fromHeader.trim() : DEFAULT_TENANT_ID;
}
