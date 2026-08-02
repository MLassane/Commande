import { NextRequest, NextResponse } from "next/server";
import { saveSubscription } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const sub = await req.json();
  await saveSubscription(sub);
  return NextResponse.json({ ok: true });
}
