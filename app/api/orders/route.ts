import { NextResponse } from "next/server";
import { listOrders } from "@/lib/kv";
import { requireAdminTenantId } from "@/lib/admin-tenant";

export async function GET() {
  // Route protégée par middleware.ts (redirige/401 si non connecté).
  // On revérifie ici et on récupère le tenantId = identifiant du marchand
  // connecté, pour qu'il ne voie que ses propres commandes.
  let tenantId: string;
  try {
    tenantId = await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const orders = await listOrders(tenantId);
  return NextResponse.json({ orders });
}
