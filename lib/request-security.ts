export function isAllowedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export function isSafeProductImage(imageUrl: string, imageKey?: string | null) {
  if (imageKey) {
    try {
      const url = new URL(imageUrl);
      return url.hostname.endsWith(".blob.vercel-storage.com") && imageKey.startsWith("products/") && url.pathname.slice(1) === imageKey;
    } catch {
      return false;
    }
  }
  return imageUrl.startsWith("/products/");
}
