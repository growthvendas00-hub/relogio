import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("storefront includes the MVP sales flow", async () => {
  const [storefront, styles, layout] = await Promise.all([
    read("app/storefront.tsx"),
    read("app/globals.css"),
    read("app/layout.tsx"),
  ]);

  assert.match(storefront, /AURUM/);
  assert.match(storefront, /5528999187401/);
  assert.match(storefront, /40000/);
  assert.match(storefront, /Garantia de 30 dias/);
  assert.match(storefront, /Envio imediato/);
  assert.match(storefront, /localStorage\.setItem\("aurum-cart"/);
  assert.match(styles, /@media \(max-width:720px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /og\.png/);
  await access(new URL("public/og.png", root));
});

test("admin and persistent catalog are protected and configured", async () => {
  const [adminPage, adminClient, auth, hosting, schema, migration] = await Promise.all([
    read("app/admin/page.tsx"),
    read("app/admin/admin-dashboard.tsx"),
    read("lib/admin-auth.ts"),
    read(".openai/hosting.json"),
    read("db/schema.ts"),
    read("drizzle/0000_cool_old_lace.sql"),
  ]);

  assert.match(adminPage, /requireAdminPage/);
  assert.match(adminClient, /\/api\/uploads/);
  assert.match(adminClient, /method: "PATCH"/);
  assert.match(auth, /ADMIN_EMAIL/);
  assert.deepEqual(JSON.parse(hosting), { d1: "DB", r2: "MEDIA" });
  assert.match(schema, /products_price_nonnegative/);
  assert.match(migration, /products_active_featured_idx/);
});
