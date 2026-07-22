export function isAllowedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export function isSafeProductImage(imageUrl: string, imageKey?: string | null) {
  if (imageKey) {
    return imageKey.startsWith("products/") && imageUrl === `/api/media/${imageKey}`;
  }
  return imageUrl.startsWith("/products/");
}
