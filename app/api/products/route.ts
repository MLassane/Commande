import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/products";
import { resolveTenantId } from "@/lib/tenant";

// Route publique (utilisée par ex. par la liste /produits) : on lit le
// tenantId envoyé en header s'il existe (cas de l'admin), sinon on retombe
// sur le marchand par défaut — cohérent avec le fait qu'il n'existe pour
// l'instant qu'un seul vrai marchand.
export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const products = await listProducts(tenantId);
  return NextResponse.json({ products });
}
