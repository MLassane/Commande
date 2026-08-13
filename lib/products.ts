import { redis } from "@/lib/redis";

export type Offer = { qty: number; price: number };

// Identifiant du marchand par défaut, utilisé tant que le vrai système
// d'authentification multi-comptes (Clerk / Auth.js) n'est pas branché.
// Une fois l'auth en place, ce identifiant viendra de la session connectée
// au lieu d'être codé en dur ici.
export const DEFAULT_TENANT_ID = "default";

export type Product = {
  handle: string; // identifiant unique dans l'URL, ex: "massage-stick"
  // Identifiant du marchand propriétaire de ce produit. Permet de retrouver
  // le tenant à partir du produit seul (ex: dans la page publique /produit/[handle]),
  // sans devoir connaître le tenant à l'avance.
  tenantId: string;
  name: string;
  price: number;
  oldPrice: number;
  image: string; // nom de fichier dans /public/images/, ex: "massage-stick-1.jpg"
  description: string;
  offers?: Offer[]; // offres par quantité, optionnel
};

// La clé Redis dépend maintenant du marchand : chaque tenant a son propre
// hash de produits ("products:default", "products:acme", ...), au lieu
// d'un seul hash global partagé entre tous les marchands.
function productsKey(tenantId: string): string {
  return `products:${tenantId}`;
}

export async function saveProducts(products: Product[], tenantId: string = DEFAULT_TENANT_ID) {
  if (products.length === 0) return;
  const obj: Record<string, string> = {};
  for (const p of products) {
    // On force le tenantId du produit à celui du marchand qui écrit,
    // pour empêcher qu'un produit "change de propriétaire" par erreur.
    const withTenant: Product = { ...p, tenantId };
    obj[p.handle] = JSON.stringify(withTenant);
  }
  await redis.hset(productsKey(tenantId), obj);
}

export async function listProducts(tenantId: string = DEFAULT_TENANT_ID): Promise<Product[]> {
  const raw = await redis.hgetall<Record<string, string>>(productsKey(tenantId));
  if (!raw) return [];
  return Object.values(raw).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}

// Récupère un produit. Si tenantId n'est pas fourni (ex: page publique
// /produit/[handle] qui ne connaît pas encore le marchand), on cherche
// dans le tenant par défaut. Une fois plusieurs vrais marchands actifs,
// il faudra passer par un index global handle -> tenantId (voir note plus bas).
export async function getProduct(handle: string, tenantId: string = DEFAULT_TENANT_ID): Promise<Product | null> {
  const raw = await redis.hget<string>(productsKey(tenantId), handle);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function deleteProduct(handle: string, tenantId: string = DEFAULT_TENANT_ID) {
  await redis.hdel(productsKey(tenantId), handle);
}

// NOTE MULTI-TENANT (à faire quand plusieurs marchands seront actifs) :
// Comme chaque tenant a maintenant son propre hash de produits, deux
// marchands différents peuvent utiliser le même "handle" (ex: deux
// boutiques avec un produit "massage-stick") sans se marcher dessus.
// En revanche, la page publique /produit/[handle] doit alors savoir à
// quel tenant appartient ce handle avant d'appeler getProduct(). Deux
// solutions possibles plus tard :
//   1. Sous-domaine par marchand (acme.tonservice.com/produit/xxx) : le
//      tenantId se déduit du sous-domaine.
//   2. Un index global Redis handle -> tenantId, mis à jour à chaque
//      saveProducts(), consulté uniquement par les pages publiques.
