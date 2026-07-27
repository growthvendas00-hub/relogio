import "server-only";
import { clientAddress } from "@/lib/request-security";

type Entry = { count: number; resetAt: number };
const MAX_TRACKED_CLIENTS = 5_000;
const globalLimit = globalThis as typeof globalThis & { almareOrderLimits?: Map<string, Entry> };
const limits = globalLimit.almareOrderLimits ?? new Map<string, Entry>();
globalLimit.almareOrderLimits = limits;

export function consumeOrderAttempt(request: Request) {
  const now = Date.now();
  const ip = clientAddress(request);
  for (const [key, value] of limits) if (value.resetAt <= now) limits.delete(key);
  if (limits.size > MAX_TRACKED_CLIENTS) {
    [...limits.entries()]
      .sort((left, right) => left[1].resetAt - right[1].resetAt)
      .slice(0, limits.size - MAX_TRACKED_CLIENTS)
      .forEach(([key]) => limits.delete(key));
  }
  const current = limits.get(ip);
  if (current && current.resetAt > now && current.count >= 8) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  limits.set(ip, current && current.resetAt > now
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt: now + 10 * 60 * 1000 });
  return { allowed: true, retryAfter: 0 };
}
