import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { saveOrder, listSubscriptions, Order, nextOrderNumber } from "@/lib/kv";
import { sendOrderEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, address, day, time, product, price, qty } = body;

  if (!name || !phone || !address || !day || !time) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  let orderNumber = "";
  try {
    orderNumber = await nextOrderNumber();
  } catch (err) {
    console.error("Erreur nextOrderNumber:", err);
  }

  const order: Order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    orderNumber: orderNumber || undefined,
    product: product || "Produit",
    price: price || 0,
    qty: qty || 1,
    name,
    phone,
    address,
    day,
    time,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveOrder(order);
  } catch (err) {
    console.error("Erreur saveOrder:", err);
    return NextResponse.json({ error: "save_failed", detail: String(err) }, { status: 500 });
  }

  // Notification email (Resend) — ne doit jamais faire échouer la commande.
  try {
    await sendOrderEmail(order);
  } catch (err) {
    console.error("Erreur sendOrderEmail:", err);
  }

  // Notification push (optionnelle) — ne doit jamais faire échouer la commande.
  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails("mailto:contact@example.com", vapidPublic, vapidPrivate);

      const subs = await listSubscriptions();
      const payload = JSON.stringify({
        title: "🛒 Nouvelle commande !",
        body: `${order.name} — ${order.phone}\n${order.product}`,
        url: "/admin",
      });

      await Promise.all(
        subs.map((sub) =>
          webpush.sendNotification(sub, payload).catch(() => {
            // abonnement expiré ou invalide, on ignore silencieusement
          })
        )
      );
    }
  } catch (err) {
    console.error("Erreur push:", err);
  }

  return NextResponse.json({ ok: true, id: order.id });
}
