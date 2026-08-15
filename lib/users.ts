import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";

// Un "utilisateur" ici = un compte marchand. Son id devient le tenantId
// utilisé partout ailleurs (produits, commandes) — voir lib/tenant.ts.
export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const USERS_KEY = "users_v1"; // hash Redis : email -> StoredUser (JSON)

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const raw = await redis.hget<string>(USERS_KEY, email.toLowerCase());
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function createUser(email: string, password: string): Promise<StoredUser> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("email_already_used");
  }
  // Le hash (avec sel intégré) est ce qu'on stocke — jamais le mot de
  // passe en clair.
  const passwordHash = await bcrypt.hash(password, 10);
  const user: StoredUser = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  await redis.hset(USERS_KEY, { [normalizedEmail]: JSON.stringify(user) });
  return user;
}

export async function verifyPassword(email: string, password: string): Promise<StoredUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}
