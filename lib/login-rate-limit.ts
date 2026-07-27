import "server-only";
import { clientAddress } from "@/lib/request-security";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_CLIENTS = 1_000;

type Attempt = { count: number; resetAt: number };

const globalRateLimit = globalThis as typeof globalThis & {
  aurumLoginAttempts?: Map<string, Attempt>;
};

const attempts = globalRateLimit.aurumLoginAttempts ?? new Map<string, Attempt>();
globalRateLimit.aurumLoginAttempts = attempts;

function prune(now: number) {
  for (const [key, attempt] of attempts) {
    if (attempt.resetAt <= now) attempts.delete(key);
  }
  if (attempts.size <= MAX_TRACKED_CLIENTS) return;
  const overflow = attempts.size - MAX_TRACKED_CLIENTS;
  [...attempts.entries()]
    .sort((left, right) => left[1].resetAt - right[1].resetAt)
    .slice(0, overflow)
    .forEach(([key]) => attempts.delete(key));
}

export function consumeLoginAttempt(request: Request) {
  const now = Date.now();
  prune(now);
  const key = clientAddress(request);
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)), key };
  }
  const next = current && current.resetAt > now
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt: now + WINDOW_MS };
  attempts.set(key, next);
  return { allowed: true, retryAfterSeconds: 0, key };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
