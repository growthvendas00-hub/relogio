import { del } from "@vercel/blob";
import { getAdminUser } from "@/lib/admin-auth";
import { deleteProduct, updateProduct } from "@/lib/product-store";
import { findProduct } from "@/lib/product-store";
import { isAllowedMutationOrigin, isSafeProductImage } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function clean(payload: Record<string, unknown>) {
  const allowed = [
    "slug", "name", "eyebrow", "description", "priceCents", "compareAtPriceCents", "stock",
    "category", "caseColor", "strap", "movement", "waterResistance", "imageUrl", "imageKey", "featured", "active",
  ];
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
  try {
    const { id } = await context.params;
    const payload = clean((await request.json()) as Record<string, unknown>);
    if (payload.name !== undefined && !String(payload.name).trim()) {
      return Response.json({ error: "O nome é obrigatório." }, { status: 400 });
    }
    if (payload.priceCents !== undefined && (typeof payload.priceCents !== "number" || !Number.isInteger(payload.priceCents) || payload.priceCents <= 0 || payload.priceCents > 100_000_000)) {
      return Response.json({ error: "Informe um preço válido." }, { status: 400 });
    }
    if (payload.stock !== undefined && (typeof payload.stock !== "number" || !Number.isInteger(payload.stock) || payload.stock < 0 || payload.stock > 100_000)) {
      return Response.json({ error: "Informe um estoque válido." }, { status: 400 });
    }
    if (payload.compareAtPriceCents !== undefined && payload.compareAtPriceCents !== null && (typeof payload.compareAtPriceCents !== "number" || !Number.isInteger(payload.compareAtPriceCents) || payload.compareAtPriceCents <= 0 || payload.compareAtPriceCents > 100_000_000)) {
      return Response.json({ error: "Informe um preço anterior válido." }, { status: 400 });
    }
    if (payload.active !== undefined && typeof payload.active !== "boolean") {
      return Response.json({ error: "Informe uma visibilidade válida." }, { status: 400 });
    }
    if (payload.featured !== undefined && typeof payload.featured !== "boolean") {
      return Response.json({ error: "Informe um destaque válido." }, { status: 400 });
    }
    const textFields = ["name", "eyebrow", "description", "category", "caseColor", "strap", "movement", "waterResistance"];
    if (textFields.some((key) => payload[key] !== undefined && String(payload[key]).trim().length > (key === "description" ? 1200 : 120))) {
      return Response.json({ error: "Um dos campos excede o limite permitido." }, { status: 400 });
    }
    if (payload.description !== undefined && !String(payload.description).trim()) {
      return Response.json({ error: "A descrição é obrigatória." }, { status: 400 });
    }
    const current = await findProduct(id);
    if (!current) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    if (payload.imageUrl !== undefined || payload.imageKey !== undefined) {
      const nextUrl = String(payload.imageUrl ?? current.imageUrl);
      const nextKey = payload.imageKey === undefined ? current.imageKey : payload.imageKey ? String(payload.imageKey) : null;
      if (!isSafeProductImage(nextUrl, nextKey)) return Response.json({ error: "A referência da foto é inválida." }, { status: 400 });
    }
    const product = await updateProduct(id, payload);
    if (product && current.imageKey && current.imageKey !== product.imageKey && current.imageUrl.includes(".blob.vercel-storage.com/")) {
      await del(current.imageUrl).catch(() => undefined);
    }
    return product ? Response.json({ product }) : Response.json({ error: "Produto não encontrado." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível editar o produto." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
  try {
    const { id } = await context.params;
    const product = await deleteProduct(id);
    if (!product) return Response.json({ error: "Produto não encontrado." }, { status: 404 });

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível excluir o produto." }, { status: 400 });
  }
}
