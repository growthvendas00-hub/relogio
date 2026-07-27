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
const useMemoryCatalog = process.env.AURUM_TEST_STORAGE === "memory" && !process.env.VERCEL;
const globalCatalog = globalThis as typeof globalThis & { aurumMemoryCatalog?: Product[] };

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
  {
    id: "skmei-1146", slug: "skmei-anadigi-1146-prata-preto", name: "Relógio Masculino SKMEI AnaDigi 1146 — Prata e Preto", eyebrow: "Esportivo ana-digital",
    description: "Modelo robusto com caixa e pulseira em aço prateado, mostrador preto, leitura analógica e digital e detalhes vermelhos.",
    priceCents: 24990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto",
    strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições",
    imageUrl: "/products/skmei-1146.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "tuguir-tg1156", slug: "tuguir-anadigi-tg1156-prata-vermelho", name: "Relógio Masculino Tuguir AnaDigi TG1156 — Prata e Vermelho", eyebrow: "Performance urbana",
    description: "Relógio ana-digital de presença marcante, com pulseira prateada, mostrador preto e aro interno vermelho.",
    priceCents: 26990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata, preto e vermelho",
    strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições",
    imageUrl: "/products/tuguir-tg1156.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "skmei-2120-dourado", slug: "skmei-anadigi-2120-dourado", name: "Relógio Unissex SKMEI AnaDigi 2120 — Dourado", eyebrow: "Dourado contemporâneo",
    description: "Visual minimalista com acabamento integral dourado, mostrador preto e display digital discreto às seis horas.",
    priceCents: 21990, compareAtPriceCents: null, stock: 1, category: "Casual", caseColor: "Dourado e preto",
    strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições",
    imageUrl: "/products/skmei-2120-dourado.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "skmei-2120-prata", slug: "skmei-anadigi-2120-prata", name: "Relógio Unissex SKMEI AnaDigi 2120 — Prata", eyebrow: "Minimalismo urbano",
    description: "Acabamento prateado, mostrador preto limpo e display digital discreto para uma leitura versátil no dia a dia.",
    priceCents: 19990, compareAtPriceCents: null, stock: 1, category: "Casual", caseColor: "Prata e preto",
    strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições",
    imageUrl: "/products/skmei-2120-prata.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "skmei-0992", slug: "skmei-analogico-0992-prata-preto", name: "Relógio Masculino SKMEI Analógico 0992 — Prata e Preto", eyebrow: "Robusto essencial",
    description: "Modelo analógico com caixa robusta, bezel preto aparafusado, pulseira bicolor em aço e calendário lateral.",
    priceCents: 17990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto",
    strap: "Aço bicolor", movement: "Quartzo analógico", waterResistance: "Consulte condições",
    imageUrl: "/products/skmei-0992.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "skmei-1649", slug: "skmei-anadigi-1649-prata-preto", name: "Relógio Masculino SKMEI AnaDigi 1649 — Prata e Preto", eyebrow: "Impacto esportivo",
    description: "Caixa angular de grande presença, bezel preto numerado, pulseira em aço e múltiplas leituras digitais integradas.",
    priceCents: 25990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto",
    strap: "Aço", movement: "Analógico e digital", waterResistance: "3 ATM",
    imageUrl: "/products/skmei-1649.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "skmei-1335-dourado", slug: "skmei-digital-1335-dourado", name: "Relógio Masculino SKMEI Digital 1335 — Dourado", eyebrow: "Digital retrô",
    description: "Caixa digital retangular com acabamento dourado escovado, pulseira em aço e tela multifunções de leitura ampla.",
    priceCents: 22990, compareAtPriceCents: null, stock: 1, category: "Digital", caseColor: "Dourado e preto",
    strap: "Aço", movement: "Digital", waterResistance: "5 ATM",
    imageUrl: "/products/skmei-1335-dourado.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "skmei-2049", slug: "skmei-anadigi-2049-prata", name: "Relógio Masculino SKMEI AnaDigi 2049 — Prata", eyebrow: "Tecnologia em aço",
    description: "Mostrador preto com duas janelas digitais, leitura analógica sobreposta e pulseira prateada de três colunas.",
    priceCents: 23990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto",
    strap: "Aço", movement: "Analógico e digital", waterResistance: "3 ATM",
    imageUrl: "/products/skmei-2049.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "weide-wh5205", slug: "weide-anadigi-wh5205-prata-preto", name: "Relógio Masculino Weide AnaDigi WH-5205 — Prata e Preto", eyebrow: "Rugged premium",
    description: "Caixa robusta em prata e preto, mostrador ana-digital multifunções, detalhes vermelhos e pulseira esportiva em borracha.",
    priceCents: 28990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto",
    strap: "Borracha preta", movement: "Analógico e digital", waterResistance: "Consulte condições",
    imageUrl: "/products/weide-wh5205.webp", imageKey: null, featured: false, active: true,
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
  },
];

export function catalogStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) || useMemoryCatalog;
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
  if (useMemoryCatalog) return structuredClone(globalCatalog.aurumMemoryCatalog ?? demoProducts);
  if (!catalogStorageConfigured()) return demoProducts;
  const result = await list({ prefix: CATALOG_PREFIX, limit: 100 });
  const latest = result.blobs.sort((a, b) =>
    b.uploadedAt.getTime() - a.uploadedAt.getTime() || b.pathname.localeCompare(a.pathname),
  )[0];
  if (!latest) return demoProducts;

  const response = await fetch(latest.url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("Não foi possível ler o catálogo da Vercel Blob.");
  return validateCatalog(await response.json());
}

async function writeCatalog(products: Product[]) {
  if (!catalogStorageConfigured()) throw new Error("Configure BLOB_READ_WRITE_TOKEN na Vercel antes de editar o catálogo.");
  if (useMemoryCatalog) {
    globalCatalog.aurumMemoryCatalog = structuredClone(products);
    return;
  }
  const pathname = `${CATALOG_PREFIX}${Date.now()}-${crypto.randomUUID()}.json`;
  await put(pathname, JSON.stringify(products), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });

  const versions = await list({ prefix: CATALOG_PREFIX, limit: 100 });
  const obsolete = versions.blobs
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime() || b.pathname.localeCompare(a.pathname))
    .slice(MAX_CATALOG_VERSIONS)
    .map((blob) => blob.url);
  if (obsolete.length) await del(obsolete).catch(() => undefined);
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
