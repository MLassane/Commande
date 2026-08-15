import { NextRequest, NextResponse } from "next/server";
import { saveProducts, Product } from "@/lib/products";
import { requireAdminTenantId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  // Route protégée par middleware.ts (import CSV, ajout, édition d'offres
  // passent tous par ici — voir app/admin/produits/page.tsx).
  let tenantId: string;
  try {
    tenantId = await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const products: Product[] = body.products;

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  try {
    // saveProducts force le tenantId du marchand connecté sur chaque
    // produit (voir lib/products.ts) — impossible d'écrire dans le
    // catalogue d'un autre marchand même en trafiquant la requête.
    await saveProducts(products, tenantId);
  } catch (err) {
    return NextResponse.json({ error: "save_failed", detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: products.length });
}
