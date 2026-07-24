export function isAllowedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === new URL(request.url).origin;
}

export function isSafeProductImage(imageUrl: string, imageKey?: string | null) {
  if (imageKey) {
    try {
      const url = new URL(imageUrl);
      return url.protocol === "https:"
        && url.hostname.endsWith(".blob.vercel-storage.com")
        && /^products\/[^/]+\.(?:jpe?g|png|webp)$/i.test(imageKey)
        && url.pathname.slice(1) === imageKey;
    } catch {
      return false;
    }
  }
  return /^\/products\/[^/]+\.(?:jpe?g|png|webp)$/i.test(imageUrl);
}
