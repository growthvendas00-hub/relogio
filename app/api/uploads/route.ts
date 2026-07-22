import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdminUser } from "@/lib/admin-auth";
import { isAllowedMutationOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    if (body.type === "blob.generate-client-token") {
      if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
      if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await getAdminUser())) throw new Error("Acesso não autorizado.");
        const metadata = JSON.parse(clientPayload || "{}") as { size?: number; type?: string };
        if (!pathname.startsWith("products/") || pathname.includes("..")) throw new Error("Nome de arquivo inválido.");
        if (!metadata.type || !allowedTypes.includes(metadata.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
        if (!Number.isFinite(metadata.size) || Number(metadata.size) > maxBytes) throw new Error("A imagem deve ter no máximo 8 MB.");
        return {
          allowedContentTypes: allowedTypes,
          maximumSizeInBytes: maxBytes,
          addRandomSuffix: true,
          cacheControlMaxAge: 31_536_000,
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível enviar a imagem." }, { status: 400 });
  }
}
