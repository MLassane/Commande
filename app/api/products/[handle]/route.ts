import { NextRequest, NextResponse } from "next/server";
import { getProduct, deleteProduct } from "@/lib/products";
import { resolvePublicTenantId, requireAdminTenantId } from "@/lib/tenant";

// GET reste public : la page /produit/[handle] et la page /commande en ont
// besoin sans que le client final soit connecté. Le tenant est résolu via
// le header x-tenant-id (envoyé par l'admin) ou le tenant par défaut sinon.
export async function GET(req: NextRequest, { params }: { params: { handle: string } }) {
  const tenantId = resolvePublicTenantId(req);
  const product = await getProduct(params.handle, tenantId);
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  return NextResponse.json({ product }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

// DELETE est admin-only. Cette route n'est pas dans le matcher du
// middleware (qui ne peut filtrer que par chemin, pas par méthode HTTP,
// et /api/products/[handle] doit rester accessible en GET sans connexion),
// donc on vérifie l'authentification Auth.js manuellement ici.
export async function DELETE(req: NextRequest, { params }: { params: { handle: string } }) {
  let tenantId: string;
  try {
    tenantId = await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteProduct(params.handle, tenantId);
  return NextResponse.json({ ok: true });
}
