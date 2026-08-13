import { NextRequest, NextResponse } from "next/server";
import { deleteOrder } from "@/lib/kv";
import { resolveTenantId } from "@/lib/tenant";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // On supprime la commande dans le hash du marchand courant uniquement —
  // un marchand ne peut pas supprimer la commande d'un autre par erreur.
  const tenantId = resolveTenantId(req);
  await deleteOrder(params.id, tenantId);
  return NextResponse.json({ ok: true });
}
