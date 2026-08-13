import { NextRequest, NextResponse } from "next/server";
import { getProduct, deleteProduct } from "@/lib/products";
import { resolveTenantId } from "@/lib/tenant";

// GET reste accessible publiquement (page /produit/[handle] et /commande
// en ont besoin sans être connectées) : on résout le tenant depuis le
// header si présent (admin), sinon le tenant par défaut.
export async function GET(req: NextRequest, { params }: { params: { handle: string } }) {
  const tenantId = resolveTenantId(req);
  const product = await getProduct(params.handle, tenantId);
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  return NextResponse.json({ product }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(req: NextRequest, { params }: { params: { handle: string } }) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // On supprime uniquement dans le catalogue du marchand courant.
  const tenantId = resolveTenantId(req);
  await deleteProduct(params.handle, tenantId);
  return NextResponse.json({ ok: true });
}
