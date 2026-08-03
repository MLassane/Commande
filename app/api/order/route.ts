import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { saveOrder, listSubscriptions, Order } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, address, day, time, product, price } = body;

  if (!name || !phone || !address || !day || !time) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const order: Order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    product: product || "Produit",
    price: price || 0,
    name,
    phone,
    address,
    day,
    time,
    createdAt: new Date().toISOString(),
  };

  await saveOrder(order);

  // Envoie une notification push à tous les navigateurs abonnés (toi),
  // seulement si les clés VAPID sont configurées sur Vercel.
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
  } else {
    console.warn("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes — notification non envoyée.");
  }

  return NextResponse.json({ ok: true, id: order.id });
}
