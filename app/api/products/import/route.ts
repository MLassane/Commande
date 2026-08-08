import { NextRequest, NextResponse } from "next/server";
import { saveProducts, Product } from "@/lib/products";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const products: Product[] = body.products;

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  try {
    await saveProducts(products);
  } catch (err) {
    return NextResponse.json({ error: "save_failed", detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: products.length });
}
