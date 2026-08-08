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

// Offres groupées (quantité). La 1ère est sélectionnée par défaut.
export const OFFERS = [
  { qty: 1, price: 9900, label: "1 Massage Stick" },
  { qty: 2, price: 14900, label: "2 Massage Stick" },
  { qty: 3, price: 29900, label: "3 Massage Stick" },
];

// Numéro WhatsApp Business qui recevra les commandes (format international,
// sans le "+" ni espaces).
export const WHATSAPP_NUMBER = "22785377631";

// Email qui recevra une notification à chaque nouvelle commande.
export const ADMIN_EMAIL = "ecomniger1@gmail.com";
