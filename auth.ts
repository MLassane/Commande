import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/users";
import { authConfig } from "@/auth.config";

// Config complète, utilisée par les routes API (Node.js normal, pas
// l'Edge Runtime) : reprend la config de base (auth.config.ts) et y
// ajoute le provider Credentials, qui a besoin de bcryptjs pour vérifier
// le mot de passe contre Redis (voir lib/users.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await verifyPassword(email, password);
        if (!user) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
});
