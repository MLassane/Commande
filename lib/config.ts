// Modifie ces valeurs pour chaque produit que tu vends.
// Pour vendre plusieurs produits sur ce même site, tu peux dupliquer le
// dossier app/commande en app/commande-produit2 et changer ces valeurs
// dans un fichier séparé, ou passer le nom/prix en paramètre d'URL.

export const PRODUCT = {
  name: "Massage Stick",
  price: 9900,
  oldPrice: 19000,
  currency: "FCFA",
};

// Offres groupées (quantité) pour le produit par défaut. La 1ère est
// sélectionnée par défaut.
export const OFFERS = [
  { qty: 1, price: 9900 },
  { qty: 2, price: 14900 },
  { qty: 3, price: 29900 },
];

// Numéro WhatsApp Business qui recevra les commandes (format international,
// sans le "+" ni espaces).
export const WHATSAPP_NUMBER = "22785377631";

// Email qui recevra une notification à chaque nouvelle commande.
export const ADMIN_EMAIL = "ecomniger1@gmail.com";
