import { redis } from "@/lib/redis";
import { DEFAULT_TENANT_ID } from "@/lib/products";

export type Order = {
  id: string;
  orderNumber?: string;
  // Marchand propriétaire de la commande, pour que chaque tenant ne voie
  // que ses propres commandes dans son dashboard admin.
  tenantId: string;
  product: string;
  price: number;
  qty?: number;
  name: string;
  phone: string;
  address: string;
  day: string;
  time: string;
  createdAt: string;
};

// Clés Redis scopées par marchand : le compteur de numéro de commande et
// le hash de commandes sont désormais séparés par tenant, comme pour les
// produits. Ça évite qu'un marchand voie le numéro/les commandes d'un autre.
function ordersKey(tenantId: string): string {
  return `orders:${tenantId}`;
}
function counterKey(tenantId: string): string {
  return `orders_counter:${tenantId}`;
}

// Génère un numéro de commande lisible et séquentiel (CMD-001, CMD-002...),
// propre à chaque marchand (chaque tenant recommence sa propre numérotation).
export async function nextOrderNumber(tenantId: string = DEFAULT_TENANT_ID): Promise<string> {
  const n = await redis.incr(counterKey(tenantId));
  return `CMD-${String(n).padStart(3, "0")}`;
}

export async function saveOrder(order: Order) {
  // Le tenantId doit déjà être renseigné sur l'objet order (voir route
  // /api/order qui le fixe à la création) ; on l'utilise pour choisir
  // dans quel hash Redis la commande est rangée.
  await redis.hset(ordersKey(order.tenantId), { [order.id]: JSON.stringify(order) });
}

export async function listOrders(tenantId: string = DEFAULT_TENANT_ID): Promise<Order[]> {
  const raw = await redis.hgetall<Record<string, string>>(ordersKey(tenantId));
  if (!raw) return [];
  const orders = Object.values(raw).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  return orders.sort((a: Order, b: Order) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteOrder(id: string, tenantId: string = DEFAULT_TENANT_ID) {
  await redis.hdel(ordersKey(tenantId), id);
}

export async function saveSubscription(sub: unknown) {
  await redis.sadd("push_subscriptions", JSON.stringify(sub));
}

export async function listSubscriptions(): Promise<any[]> {
  const raw = await redis.smembers("push_subscriptions");
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
