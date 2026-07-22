import { env } from "cloudflare:workers";
import { getAdminUser } from "@/lib/admin-auth";
import { isAllowedMutationOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });

  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecione uma foto." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return Response.json({ error: "Use uma imagem JPG, PNG ou WebP." }, { status: 400 });
  if (file.size > maxBytes) return Response.json({ error: "A imagem deve ter no máximo 8 MB." }, { status: 400 });

  const runtimeEnv = env as unknown as { MEDIA?: R2Bucket };
  if (!runtimeEnv.MEDIA) return Response.json({ error: "Armazenamento de imagens indisponível." }, { status: 503 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const isJpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if ((file.type === "image/png" && !isPng) || (file.type === "image/jpeg" && !isJpeg) || (file.type === "image/webp" && !isWebp)) {
    return Response.json({ error: "O conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `products/${crypto.randomUUID()}.${extension}`;
  await runtimeEnv.MEDIA.put(key, bytes.buffer, {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });
  return Response.json({ key, url: `/api/media/${key}` }, { status: 201 });
}
