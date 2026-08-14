import { NextRequest, NextResponse } from "next/server";
import { deleteOrder } from "@/lib/kv";
import { requireAdminTenantId } from "@/lib/tenant";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // Route protégée par middleware.ts. On supprime la commande uniquement
  // dans le hash du marchand connecté — impossible de supprimer la
  // commande d'un autre marchand même en devinant son id.
  let tenantId: string;
  try {
    tenantId = requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteOrder(params.id, tenantId);
  return NextResponse.json({ ok: true });
}
