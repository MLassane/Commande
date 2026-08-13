import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/lib/kv";
import { resolveTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Chaque marchand ne voit que ses propres commandes.
  const tenantId = resolveTenantId(req);
  const orders = await listOrders(tenantId);
  return NextResponse.json({ orders });
}
