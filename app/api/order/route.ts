import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { saveOrder, listSubscriptions, Order, nextOrderNumber } from "@/lib/kv";
import { sendOrderEmail } from "@/lib/email";
import { DEFAULT_TENANT_ID } from "@/lib/products";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, address, day, time, product, price, qty, tenantId } = body;

  if (!name || !phone || !address || !day || !time) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Le tenantId vient de la page /commande, qui le récupère lors du chargement
  // du produit (voir app/commande/page.tsx). S'il manque (ex: lien direct
  // ?nom=...&prix=... sans passer par le catalogue), on retombe sur le
  // marchand par défaut, pour rester compatible avec les anciens liens.
  const resolvedTenantId: string = tenantId || DEFAULT_TENANT_ID;

  let orderNumber = "";
  try {
    orderNumber = await nextOrderNumber(resolvedTenantId);
  } catch (err) {
    console.error("Erreur nextOrderNumber:", err);
  }

  const order: Order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    orderNumber: orderNumber || undefined,
    tenantId: resolvedTenantId,
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
