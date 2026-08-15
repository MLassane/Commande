import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { resolvePublicTenantId } from "@/lib/tenant";
import { recordVisit } from "@/lib/visits";

// On utilise ici la config "légère" (sans bcrypt) car le middleware
// tourne dans l'Edge Runtime — voir le commentaire dans auth.config.ts.
const { auth } = NextAuth(authConfig);

// Routes qui nécessitent d'être connecté : les pages admin elles-mêmes,
// et les routes API utilisées uniquement par l'admin (import/suppression
// de produits, consultation/suppression des commandes, statistiques).
const PROTECTED_PREFIXES = ["/admin", "/api/products/import", "/api/orders", "/api/stats"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

// Pages "vitrine" côté client, sur lesquelles on compte une visite. On ne
// compte volontairement pas /admin/* (usage interne) ni /api/* (pas des
// pages vues par un visiteur).
const TRACKED_PREFIXES = ["/produits", "/produit", "/commande"];

function isTracked(pathname: string): boolean {
  return pathname === "/" || TRACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const VISITOR_COOKIE = "visitor_id";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // --- Protection admin (inchangé) ---
  if (isProtected(pathname)) {
    if (!req.auth) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const signInUrl = new URL("/sign-in", req.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // --- Suivi de visite (pages publiques uniquement, requêtes GET) ---
  if (req.method === "GET" && isTracked(pathname)) {
    // Identifiant anonyme du visiteur : un id aléatoire stocké dans un
    // cookie longue durée, sans aucune donnée personnelle. S'il existe
    // déjà, on le réutilise pour ne pas compter deux fois le même
    // visiteur revenant plus tard.
    let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        maxAge: 60 * 60 * 24 * 365, // 1 an
        httpOnly: true,
        sameSite: "lax",
      });
    }
    const tenantId = resolvePublicTenantId(req);
    // On attend la requête Redis (rapide, API REST Upstash) : dans le
    // runtime Edge, une promesse "oubliée" (sans await) risque d'être
    // interrompue avant la fin dès que la réponse est envoyée, ce qui
    // ferait perdre silencieusement des visites.
    try {
      await recordVisit(tenantId, visitorId);
    } catch {
      // Le comptage de visites n'est jamais bloquant : une erreur ici ne
      // doit pas empêcher la page de s'afficher normalement.
    }
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)",
    "/(api|trpc)(.*)",
  ],
};
