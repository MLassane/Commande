import { redis } from "@/lib/redis";

// Clé Redis pour un jour donné : un "Set" qui contient l'id anonyme de
// chaque visiteur unique de la journée. SADD ignore les doublons, donc
// SCARD (taille du set) donne directement le nombre de visiteurs
// uniques ce jour-là.
//
// Note : dateKey() utilise le fuseau UTC pour simplifier — les stats
// "Aujourd'hui" peuvent donc décaler de quelques heures par rapport à
// minuit local au Niger (UTC+1), ce qui est un compromis acceptable pour
// des stats approximatives comme sur Shopify.
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // "2026-08-15"
}

function visitsKey(tenantId: string, date: Date): string {
  return `visits:${tenantId}:${dateKey(date)}`;
}

// Enregistre une visite anonyme. Appelé depuis le middleware à chaque
// chargement de page publique (voir middleware.ts).
export async function recordVisit(tenantId: string, visitorId: string) {
  const key = visitsKey(tenantId, new Date());
  await redis.sadd(key, visitorId);
  // Expire après 90 jours pour ne pas accumuler indéfiniment de vieux
  // sets — largement suffisant pour les stats "30 derniers jours".
  await redis.expire(key, 60 * 60 * 24 * 90);
}

// Nombre de visiteurs uniques cumulés sur les N derniers jours (somme des
// visiteurs uniques par jour — un même visiteur revenant deux jours de
// suite compte deux fois, comme c'est l'usage standard pour ce type de
// stat simplifiée).
export async function getVisitsForRange(tenantId: string, days: number): Promise<number> {
  let total = 0;
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = await redis.scard(visitsKey(tenantId, d));
    total += count || 0;
  }
  return total;
}
