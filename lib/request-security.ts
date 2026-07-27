export class RequestBodyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

export function isAllowedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === new URL(request.url).origin;
}

export function clientAddress(request: Request) {
  const value = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown";
  return value.split(",")[0].trim().slice(0, 120) || "unknown";
}

export async function readJsonBody<T>(request: Request, maximumBytes: number): Promise<T> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new RequestBodyError("Envie os dados em formato JSON.", 415);

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestBodyError("A requisição excede o limite permitido.", 413);
  }
  if (!request.body) throw new RequestBodyError("O corpo da requisição está vazio.", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new RequestBodyError("A requisição excede o limite permitido.", 413);
    }
    chunks.push(value);
  }
  if (!total) throw new RequestBodyError("O corpo da requisição está vazio.", 400);

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
  } catch {
    throw new RequestBodyError("O JSON enviado é inválido.", 400);
  }
}

export function requestErrorStatus(error: unknown, fallback = 400) {
  return error instanceof RequestBodyError ? error.status : fallback;
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
