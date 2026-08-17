import type { NextAuthConfig } from "next-auth";

// Config "légère", compatible avec l'Edge Runtime du middleware : PAS de
// provider Credentials ici (il dépend de bcryptjs, qui utilise des API
// Node.js non supportées dans l'Edge Runtime). Le middleware a seulement
// besoin de savoir si une session valide existe, pas de vérifier un
// mot de passe — la vérification complète se fait dans auth.ts (utilisé
// par les routes API, qui tournent en Node.js normal).
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/sign-in",
  },
  providers: [], // les providers réels sont ajoutés dans auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.userId as string;
      return session;
    },
  },
};
