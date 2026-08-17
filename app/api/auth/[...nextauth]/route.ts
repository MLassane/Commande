import { handlers } from "@/auth";

// Auth.js gère lui-même toutes les routes de connexion/déconnexion/session
// sous /api/auth/* — rien à coder ici, juste brancher les handlers.
export const { GET, POST } = handlers;
