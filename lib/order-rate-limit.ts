import "server-only";

type Entry = { count: number; resetAt: number };
const globalLimit = globalThis as typeof globalThis & { almareOrderLimits?: Map<string, Entry> };
const limits = globalLimit.almareOrderLimits ?? new Map<string, Entry>();
globalLimit.almareOrderLimits = limits;

export function consumeOrderAttempt(request: Request) {
  const now = Date.now();
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").slice(0, 120);
  for (const [key, value] of limits) if (value.resetAt <= now) limits.delete(key);
  const current = limits.get(ip);
  if (current && current.resetAt > now && current.count >= 8) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  limits.set(ip, current && current.resetAt > now
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt: now + 10 * 60 * 1000 });
  return { allowed: true, retryAfter: 0 };
}
