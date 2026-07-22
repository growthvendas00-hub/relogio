import { env } from "cloudflare:workers";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products, type NewProduct, type Product } from "@/db/schema";

const demoProducts: NewProduct[] = [
  {
    id: "atlas-black",
    slug: "atlas-black",
    name: "Atlas Black",
    eyebrow: "Best-seller",
    description: "Minimalismo em preto fosco com marcadores dourados. Presença marcante para o trabalho e para a noite.",
    priceCents: 34990,
    compareAtPriceCents: 39990,
    stock: 8,
    category: "Urbano",
    caseColor: "Preto fosco",
    strap: "Aço escovado",
    movement: "Quartzo japonês",
    waterResistance: "3 ATM",
    imageUrl: "/products/atlas-black.png",
    featured: true,
    active: true,
  },
  {
    id: "monarque-gold",
    slug: "monarque-gold",
    name: "Monarque Gold",
    eyebrow: "Edição dourada",
    description: "Acabamento dourado escovado e mostrador preto profundo para ocasiões que pedem um nível a mais.",
    priceCents: 42990,
    compareAtPriceCents: 47990,
    stock: 5,
    category: "Premium",
    caseColor: "Dourado",
    strap: "Aço escovado",
    movement: "Quartzo japonês",
    waterResistance: "3 ATM",
    imageUrl: "/products/monarque-gold.png",
    featured: true,
    active: true,
  },
  {
    id: "horizon-steel",
    slug: "horizon-steel",
    name: "Horizon Steel",
    eyebrow: "Clássico contemporâneo",
    description: "Caixa em aço, mostrador azul-marinho e pulseira em couro. Versátil do escritório ao fim de semana.",
    priceCents: 38990,
    compareAtPriceCents: null,
    stock: 11,
    category: "Casual",
    caseColor: "Prata",
    strap: "Couro azul-marinho",
    movement: "Quartzo japonês",
    waterResistance: "3 ATM",
    imageUrl: "/products/horizon-steel.png",
    featured: false,
    active: true,
  },
];

let schemaReady: Promise<void> | null = null;

export async function ensureProductSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const database = env.DB;
    await database.batch([
      database.prepare(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        eyebrow TEXT NOT NULL DEFAULT 'Coleção Urbana',
        description TEXT NOT NULL,
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        compare_at_price_cents INTEGER CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= 0),
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        category TEXT NOT NULL DEFAULT 'Casual',
        case_color TEXT NOT NULL DEFAULT 'Preto',
        strap TEXT NOT NULL DEFAULT 'Aço',
        movement TEXT NOT NULL DEFAULT 'Quartzo',
        water_resistance TEXT NOT NULL DEFAULT '3 ATM',
        image_url TEXT NOT NULL,
        image_key TEXT,
        featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      database.prepare("CREATE INDEX IF NOT EXISTS products_active_featured_idx ON products (active, featured)"),
      database.prepare("CREATE INDEX IF NOT EXISTS products_category_idx ON products (category)"),
    ]);

    const count = await database.prepare("SELECT COUNT(*) AS total FROM products").first<{ total: number }>();
    if (!count?.total) {
      const db = getDb();
      await db.insert(products).values(demoProducts).onConflictDoNothing();
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  await ensureProductSchema();
  const db = getDb();
  if (includeInactive) {
    return db.select().from(products).orderBy(desc(products.featured), asc(products.name));
  }
  return db.select().from(products).where(eq(products.active, true)).orderBy(desc(products.featured), asc(products.name));
}

export async function findProduct(id: string) {
  await ensureProductSchema();
  const [product] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  return product ?? null;
}

export async function createProduct(input: NewProduct) {
  await ensureProductSchema();
  const [product] = await getDb().insert(products).values(input).returning();
  return product;
}

export async function updateProduct(id: string, input: Partial<NewProduct>) {
  await ensureProductSchema();
  const [product] = await getDb()
    .update(products)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id))
    .returning();
  return product ?? null;
}

export async function deleteProduct(id: string) {
  await ensureProductSchema();
  const [product] = await getDb().delete(products).where(eq(products.id, id)).returning();
  return product ?? null;
}
