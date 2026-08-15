import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus, OrderStatus } from "@/lib/kv";
import { requireAdminTenantId } from "@/lib/tenant";

const VALID_STATUSES: OrderStatus[] = ["en_attente", "confirmee", "livree", "annulee"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let tenantId: string;
  try {
    tenantId = await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const updated = await updateOrderStatus(params.id, status, tenantId);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order: updated });
}
