// MatinDesk — server-side auth: scrypt password hashing + DB-backed sessions.
import { randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv, createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "matin_session";
const SESSION_DAYS = 30;

// ---------- password hashing (scrypt, no external deps) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `s1:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [ver, salt, hash] = stored.split(":");
    if (ver !== "s1" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

// ---------- GitHub PAT encryption at rest (AES-256-GCM) ----------
function secretKey(): Buffer {
  const configured = process.env.MATIN_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32)) {
    throw new Error("MATIN_SECRET must be configured with at least 32 characters in production");
  }
  const secret = configured || "matindesk-local-development-only-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ver, ivB64, tagB64, dataB64] = payload.split(":");
    if (ver !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------- sessions ----------
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Returns the authenticated user (or null). Also garbage-collects expired sessions. */
export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

/** Same as currentUser but throws a 401-shaped error for API routes. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AuthError();
  return user;
}

export class AuthError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

/** Ensure a settings row exists for the user. */
export async function ensureSettings(userId: string) {
  const existing = await db.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.userSettings.create({ data: { userId } });
}

/** Decrypt the stored GitHub PAT for a user (null when not connected). */
export async function getPat(userId: string): Promise<{ pat: string; gistId: string | null } | null> {
  const s = await db.userSettings.findUnique({ where: { userId } });
  if (!s?.githubPat) return null;
  const pat = decryptSecret(s.githubPat);
  if (!pat) return null;
  return { pat, gistId: s.githubGistId };
}
