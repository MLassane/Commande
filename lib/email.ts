import { Order } from "@/lib/kv";
import { ADMIN_EMAIL } from "@/lib/config";

// Envoie un email à ADMIN_EMAIL à chaque nouvelle commande, via l'API Resend.
// Ne fait rien (silencieusement) si RESEND_API_KEY n'est pas configurée.
export async function sendOrderEmail(order: Order) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY manquante — email non envoyé.");
    return;
  }

  const html = `
    <h2>🛒 Nouvelle commande !</h2>
    <p><b>Produit :</b> ${order.product}</p>
    <p><b>Quantité :</b> ${order.qty || 1}</p>
    <p><b>Prix :</b> ${order.price.toLocaleString("fr-FR")} FCFA</p>
    <hr />
    <p><b>Nom :</b> ${order.name}</p>
    <p><b>Téléphone :</b> ${order.phone}</p>
    <p><b>Adresse :</b> ${order.address}</p>
    <p><b>Jour de livraison :</b> ${order.day}</p>
    <p><b>Heure de livraison :</b> ${order.time}</p>
    <p style="color:#999;font-size:0.85em;">Reçue le ${new Date(order.createdAt).toLocaleString("fr-FR")}</p>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Commande Store <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `🛒 Nouvelle commande — ${order.name}`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Erreur envoi email Resend:", text);
    }
  } catch (err) {
    console.error("Erreur envoi email:", err);
  }
}
