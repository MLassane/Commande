import { NextRequest, NextResponse } from "next/server";
import { getProduct, deleteProduct } from "@/lib/products";

export async function GET(req: NextRequest, { params }: { params: { handle: string } }) {
  const product = await getProduct(params.handle);
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
  await deleteProduct(params.handle);
  return NextResponse.json({ ok: true });
}
