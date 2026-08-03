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
  await redis.lpush("orders", JSON.stringify(order));
}

export async function listOrders(limit = 100): Promise<Order[]> {
  const raw = await redis.lrange<string>("orders", 0, limit - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}

export async function saveSubscription(sub: unknown) {
  await redis.sadd("push_subscriptions", JSON.stringify(sub));
}

export async function listSubscriptions(): Promise<any[]> {
  const raw = await redis.smembers("push_subscriptions");
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
