import { redis } from "@/lib/redis";

export type Order = {
  id: string;
  orderNumber?: string;
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

// Génère un numéro de commande lisible et séquentiel (CMD-001, CMD-002...).
export async function nextOrderNumber(): Promise<string> {
  const n = await redis.incr("orders_counter");
  return `CMD-${String(n).padStart(3, "0")}`;
}

export async function saveOrder(order: Order) {
  await redis.hset("orders_v2", { [order.id]: JSON.stringify(order) });
}

export async function listOrders(): Promise<Order[]> {
  const raw = await redis.hgetall<Record<string, string>>("orders_v2");
  if (!raw) return [];
  const orders = Object.values(raw).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  return orders.sort((a: Order, b: Order) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteOrder(id: string) {
  await redis.hdel("orders_v2", id);
}

export async function saveSubscription(sub: unknown) {
  await redis.sadd("push_subscriptions", JSON.stringify(sub));
}

export async function listSubscriptions(): Promise<any[]> {
  const raw = await redis.smembers("push_subscriptions");
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
