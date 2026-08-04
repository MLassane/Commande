import { Redis } from "@upstash/redis";

// Selon comment tu as connecté ton stockage Redis sur Vercel, les variables
// peuvent s'appeler différemment. On essaie les noms les plus courants.
const url =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL ||
  "";
const token =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_TOKEN ||
  "";

const redis = new Redis({ url, token });

export type Order = {
  id: string;
  product: string;
  price: number;
  name: string;
  phone: string;
  address: string;
  day: string;
  time: string;
  createdAt: string;
};

export async function saveOrder(order: Order) {
  await redis.hset("orders", { [order.id]: JSON.stringify(order) });
}

export async function listOrders(): Promise<Order[]> {
  const raw = await redis.hgetall<Record<string, string>>("orders");
  if (!raw) return [];
  const orders = Object.values(raw).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  return orders.sort((a: Order, b: Order) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteOrder(id: string) {
  await redis.hdel("orders", id);
}

export async function saveSubscription(sub: unknown) {
  await redis.sadd("push_subscriptions", JSON.stringify(sub));
}

export async function listSubscriptions(): Promise<any[]> {
  const raw = await redis.smembers("push_subscriptions");
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
