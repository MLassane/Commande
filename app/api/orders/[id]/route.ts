import { NextRequest, NextResponse } from "next/server";
import { deleteOrder } from "@/lib/kv";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteOrder(params.id);
  return NextResponse.json({ ok: true });
}
