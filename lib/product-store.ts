import "server-only";
import { del, list, put } from "@vercel/blob";

export type Product = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  category: string;
  caseColor: string;
  strap: string;
  movement: string;
  waterResistance: string;
  imageUrl: string;
  imageKey: string | null;
  featured: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
};

const CATALOG_PREFIX = "aurum/catalog/";
const MAX_CATALOG_VERSIONS = 5;

const demoProducts: Product[] = [
  {
    id: "atlas-black", slug: "atlas-black", name: "Atlas Black", eyebrow: "Best-seller",
    description: "Minimalismo em preto fosco com marcadores dourados. Presença marcante para o trabalho e para a noite.",
    priceCents: 34990, compareAtPriceCents: 39990, stock: 8, category: "Urbano", caseColor: "Preto fosco",
    strap: "Aço escovado", movement: "Quartzo japonês", waterResistance: "3 ATM",
    imageUrl: "/products/atlas-black.png", imageKey: null, featured: true, active: true,
    createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z",
  },
  {
    id: "monarque-gold", slug: "monarque-gold", name: "Monarque Gold", eyebrow: "Edição dourada",
    description: "Acabamento dourado escovado e mostrador preto profundo para ocasiões que pedem um nível a mais.",
    priceCents: 42990, compareAtPriceCents: 47990, stock: 5, category: "Premium", caseColor: "Dourado",
    strap: "Aço escovado", movement: "Quartzo japonês", waterResistance: "3 ATM",
    imageUrl: "/products/monarque-gold.png", imageKey: null, featured: true, active: true,
    createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z",
  },
  {
    id: "horizon-steel", slug: "horizon-steel", name: "Horizon Steel", eyebrow: "Clássico contemporâneo",
    description: "Caixa em aço, mostrador azul-marinho e pulseira em couro. Versátil do escritório ao fim de semana.",
    priceCents: 38990, compareAtPriceCents: null, stock: 11, category: "Casual", caseColor: "Prata",
    strap: "Couro azul-marinho", movement: "Quartzo japonês", waterResistance: "3 ATM",
    imageUrl: "/products/horizon-steel.png", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z",
  },
];

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function validateCatalog(value: unknown): Product[] {
  if (!Array.isArray(value)) throw new Error("O catálogo armazenado está em formato inválido.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("O catálogo contém um produto inválido.");
    const product = item as Product;
    if (!product.id || !product.slug || !product.name || !product.imageUrl || !Number.isInteger(product.priceCents)) {
      throw new Error("O catálogo contém dados obrigatórios ausentes.");
    }
    return product;
  });
}

async function readCatalog() {
  if (!blobConfigured()) return demoProducts;
  const result = await list({ prefix: CATALOG_PREFIX, limit: 100 });
  const latest = result.blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  if (!latest) return demoProducts;

  const response = await fetch(latest.url, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível ler o catálogo da Vercel Blob.");
  return validateCatalog(await response.json());
}

async function writeCatalog(products: Product[]) {
  if (!blobConfigured()) throw new Error("Configure BLOB_READ_WRITE_TOKEN na Vercel antes de editar o catálogo.");
  const pathname = `${CATALOG_PREFIX}${Date.now()}-${crypto.randomUUID()}.json`;
  await put(pathname, JSON.stringify(products), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });

  const versions = await list({ prefix: CATALOG_PREFIX, limit: 100 });
  const obsolete = versions.blobs
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(MAX_CATALOG_VERSIONS)
    .map((blob) => blob.url);
  if (obsolete.length) await del(obsolete);
}

export async function listProducts(includeInactive = false) {
  const products = await readCatalog();
  return products
    .filter((product) => includeInactive || product.active)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "pt-BR"));
}

export async function findProduct(id: string) {
  return (await readCatalog()).find((product) => product.id === id) ?? null;
}

export async function createProduct(input: ProductInput) {
  const products = await readCatalog();
  if (products.some((product) => product.slug === input.slug)) throw new Error("Já existe um produto com esse nome.");
  const now = new Date().toISOString();
  const product: Product = { ...input, createdAt: input.createdAt ?? now, updatedAt: input.updatedAt ?? now };
  await writeCatalog([...products, product]);
  return product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const products = await readCatalog();
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) return null;
  if (input.slug && products.some((product, productIndex) => productIndex !== index && product.slug === input.slug)) {
    throw new Error("Já existe um produto com esse nome.");
  }
  const product = { ...products[index], ...input, id, updatedAt: new Date().toISOString() };
  products[index] = product;
  await writeCatalog(products);
  return product;
}

export async function deleteProduct(id: string) {
  const products = await readCatalog();
  const product = products.find((item) => item.id === id);
  if (!product) return null;
  await writeCatalog(products.filter((item) => item.id !== id));
  if (product.imageKey && product.imageUrl.includes(".blob.vercel-storage.com/")) {
    await del(product.imageUrl).catch(() => undefined);
  }
  return product;
}
