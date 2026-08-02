import { kv } from "@vercel/kv";

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
  await kv.lpush("orders", JSON.stringify(order));
}

export async function listOrders(limit = 100): Promise<Order[]> {
  const raw = await kv.lrange("orders", 0, limit - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}

export async function saveSubscription(sub: unknown) {
  await kv.sadd("push_subscriptions", JSON.stringify(sub));
}

export async function listSubscriptions(): Promise<any[]> {
  const raw = await kv.smembers("push_subscriptions");
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
