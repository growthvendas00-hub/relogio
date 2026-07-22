import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "aurum_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

type SessionPayload = { email: string; expiresAt: number };

function base64UrlEncode(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function signature(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET deve ter pelo menos 32 caracteres.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

export async function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 10 || !password) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
  ]);
  return constantTimeEqual(new Uint8Array(left), new Uint8Array(right));
}

export async function createAdminSession() {
  const email = process.env.ADMIN_EMAIL ?? "Administrador AURUM";
  const payload: SessionPayload = { email, expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000 };
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signed = base64UrlEncode(await signature(encoded));
  return `${encoded}.${signed}`;
}

export async function verifyAdminSession(token?: string) {
  if (!token) return null;
  const [encoded, signed, ...rest] = token.split(".");
  if (!encoded || !signed || rest.length) return null;
  const expected = await signature(encoded);
  if (!constantTimeEqual(expected, base64UrlDecode(signed))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as SessionPayload;
    if (!payload.email || payload.expiresAt <= Date.now()) return null;
    return { email: payload.email, displayName: payload.email };
  } catch {
    return null;
  }
}

export async function getAdminUser() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireAdminPage(returnTo = "/admin") {
  const user = await getAdminUser();
  if (!user) redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
  return { user, authorized: true };
}

export const adminSessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_DURATION_SECONDS,
};
