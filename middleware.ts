import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// On utilise ici la config "légère" (sans bcrypt) car le middleware
// tourne dans l'Edge Runtime — voir le commentaire dans auth.config.ts.
const { auth } = NextAuth(authConfig);

// Routes qui nécessitent d'être connecté : les pages admin elles-mêmes,
// et les routes API utilisées uniquement par l'admin (import/suppression
// de produits, consultation/suppression des commandes).
const PROTECTED_PREFIXES = ["/admin", "/api/products/import", "/api/orders"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)",
    "/(api|trpc)(.*)",
  ],
};
