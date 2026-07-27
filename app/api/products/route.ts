import { catalogStorageConfigured, createProduct, listProducts } from "@/lib/product-store";
import { getAdminUser } from "@/lib/admin-auth";
import { isAllowedMutationOrigin, isSafeProductImage, readJsonBody, requestErrorStatus } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseProduct(payload: Record<string, unknown>) {
  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const imageUrl = String(payload.imageUrl ?? "").trim();
  const priceCents = payload.priceCents;
  const stock = payload.stock;

  if (!name || !description || !imageUrl) throw new Error("Preencha nome, descrição e foto.");
  if (name.length > 120 || description.length > 1200) throw new Error("Nome ou descrição excede o limite permitido.");
  if (typeof priceCents !== "number" || !Number.isInteger(priceCents) || priceCents <= 0 || priceCents > 100_000_000) {
    throw new Error("Informe um preço válido.");
  }
  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || stock > 100_000) {
    throw new Error("Informe um estoque válido.");
  }

  const compareAt = payload.compareAtPriceCents === undefined || payload.compareAtPriceCents === null || payload.compareAtPriceCents === ""
    ? null
    : payload.compareAtPriceCents;
  if (compareAt !== null && (typeof compareAt !== "number" || !Number.isInteger(compareAt) || compareAt <= 0 || compareAt > 100_000_000)) {
    throw new Error("Informe um preço anterior válido.");
  }
  if (payload.active !== undefined && typeof payload.active !== "boolean") throw new Error("Informe uma visibilidade válida.");
  if (payload.featured !== undefined && typeof payload.featured !== "boolean") throw new Error("Informe um destaque válido.");

  const slug = slugify(String(payload.slug || name));
  const imageKey = payload.imageKey ? String(payload.imageKey) : null;
  if (!slug) throw new Error("Use um nome com letras ou números.");
  if (!isSafeProductImage(imageUrl, imageKey)) throw new Error("A referência da foto é inválida.");

  const text = {
    eyebrow: String(payload.eyebrow ?? "Coleção Urbana").trim(),
    category: String(payload.category ?? "Casual").trim(),
    caseColor: String(payload.caseColor ?? "Preto").trim(),
    strap: String(payload.strap ?? "Aço").trim(),
    movement: String(payload.movement ?? "Quartzo").trim(),
    waterResistance: String(payload.waterResistance ?? "3 ATM").trim(),
  };
  if (Object.values(text).some((value) => value.length > 120)) throw new Error("Um dos campos excede o limite permitido.");
  if (!text.category) throw new Error("Informe uma categoria.");

  return {
    name,
    slug,
    eyebrow: text.eyebrow,
    description,
    priceCents,
    compareAtPriceCents: compareAt,
    stock,
    category: text.category,
    caseColor: text.caseColor,
    strap: text.strap,
    movement: text.movement,
    waterResistance: text.waterResistance,
    imageUrl,
    imageKey,
    featured: Boolean(payload.featured),
    active: payload.active !== false,
  };
}

export async function GET(request: Request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("all") === "1";
    if (includeInactive && !(await getAdminUser())) {
      return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    return Response.json({
      products: await listProducts(includeInactive),
      ...(includeInactive ? { storageConfigured: catalogStorageConfigured() } : {}),
    }, { headers: { "cache-control": includeInactive ? "private, no-store" : "public, s-maxage=30, stale-while-revalidate=300" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os produtos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });

  try {
    const input = parseProduct(await readJsonBody<Record<string, unknown>>(request, 16_384));
    const product = await createProduct({ id: crypto.randomUUID(), ...input });
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o produto.";
    const status = message.includes("UNIQUE") ? 409 : requestErrorStatus(error, 400);
    return Response.json({ error: status === 409 ? "Já existe um produto com esse nome." : message }, { status });
  }
}

export { parseProduct };
