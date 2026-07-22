import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  eyebrow: text("eyebrow").notNull().default("Coleção Urbana"),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  compareAtPriceCents: integer("compare_at_price_cents"),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull().default("Casual"),
  caseColor: text("case_color").notNull().default("Preto"),
  strap: text("strap").notNull().default("Aço"),
  movement: text("movement").notNull().default("Quartzo"),
  waterResistance: text("water_resistance").notNull().default("3 ATM"),
  imageUrl: text("image_url").notNull(),
  imageKey: text("image_key"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("products_active_featured_idx").on(table.active, table.featured),
  index("products_category_idx").on(table.category),
  check("products_price_nonnegative", sql`${table.priceCents} >= 0`),
  check("products_compare_price_nonnegative", sql`${table.compareAtPriceCents} IS NULL OR ${table.compareAtPriceCents} >= 0`),
  check("products_stock_nonnegative", sql`${table.stock} >= 0`),
]);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
