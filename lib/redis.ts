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

export const redis = new Redis({ url, token });
