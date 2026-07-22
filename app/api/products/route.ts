import { createProduct, listProducts } from "@/lib/product-store";
import { getAdminUser } from "@/lib/admin-auth";
import { isAllowedMutationOrigin, isSafeProductImage } from "@/lib/request-security";

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
  const priceCents = Number(payload.priceCents);
  const stock = Number(payload.stock);

  if (!name || !description || !imageUrl) throw new Error("Preencha nome, descrição e foto.");
  if (name.length > 120 || description.length > 1200) throw new Error("Nome ou descrição excede o limite permitido.");
  if (!Number.isInteger(priceCents) || priceCents < 0) throw new Error("Informe um preço válido.");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Informe um estoque válido.");

  const compareAt = payload.compareAtPriceCents === undefined || payload.compareAtPriceCents === null || payload.compareAtPriceCents === ""
    ? null
    : Number(payload.compareAtPriceCents);
  if (compareAt !== null && (!Number.isInteger(compareAt) || compareAt < 0)) {
    throw new Error("Informe um preço anterior válido.");
  }

  const slug = slugify(String(payload.slug || name));
  const imageKey = payload.imageKey ? String(payload.imageKey) : null;
  if (!slug) throw new Error("Use um nome com letras ou números.");
  if (!isSafeProductImage(imageUrl, imageKey)) throw new Error("A referência da foto é inválida.");

  return {
    name,
    slug,
    eyebrow: String(payload.eyebrow ?? "Coleção Urbana").trim(),
    description,
    priceCents,
    compareAtPriceCents: compareAt,
    stock,
    category: String(payload.category ?? "Casual").trim(),
    caseColor: String(payload.caseColor ?? "Preto").trim(),
    strap: String(payload.strap ?? "Aço").trim(),
    movement: String(payload.movement ?? "Quartzo").trim(),
    waterResistance: String(payload.waterResistance ?? "3 ATM").trim(),
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
    return Response.json({ products: await listProducts(includeInactive) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os produtos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });

  try {
    const input = parseProduct((await request.json()) as Record<string, unknown>);
    const product = await createProduct({ id: crypto.randomUUID(), ...input });
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o produto.";
    const status = message.includes("UNIQUE") ? 409 : 400;
    return Response.json({ error: status === 409 ? "Já existe um produto com esse nome." : message }, { status });
  }
}

export { parseProduct };
