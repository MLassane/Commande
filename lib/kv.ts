import { redis } from "@/lib/redis";

export type Order = {
  id: string;
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
