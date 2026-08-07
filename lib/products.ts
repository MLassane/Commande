import { redis } from "@/lib/redis";

export type Product = {
  handle: string; // identifiant unique dans l'URL, ex: "massage-stick"
  name: string;
  price: number;
  oldPrice: number;
  image: string; // nom de fichier dans /public/images/, ex: "massage-stick-1.jpg"
  description: string;
};

const KEY = "products_v1";

export async function saveProducts(products: Product[]) {
  if (products.length === 0) return;
  const obj: Record<string, string> = {};
  for (const p of products) obj[p.handle] = JSON.stringify(p);
  await redis.hset(KEY, obj);
}

export async function listProducts(): Promise<Product[]> {
  const raw = await redis.hgetall<Record<string, string>>(KEY);
  if (!raw) return [];
  return Object.values(raw).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}

export async function getProduct(handle: string): Promise<Product | null> {
  const raw = await redis.hget<string>(KEY, handle);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function deleteProduct(handle: string) {
  await redis.hdel(KEY, handle);
}
