import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { readStoredCart, reconcileCart, updateCartQuantity } from "../lib/cart.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("storefront includes the MVP sales flow", async () => {
  const [storefront, styles, layout] = await Promise.all([read("app/storefront.tsx"), read("app/globals.css"), read("app/layout.tsx")]);
  assert.match(storefront, /AURUM/);
  assert.match(storefront, /5528999187401/);
  assert.match(storefront, /40000/);
  assert.match(storefront, /SKMEI AnaDigi 1146/);
  assert.match(storefront, /Tuguir AnaDigi TG1156/);
  assert.match(storefront, /Weide AnaDigi WH-5205/);
  assert.match(storefront, /Garantia de 30 dias/);
  assert.match(storefront, /Envio imediato/);
  assert.match(storefront, /\/hero\/aurum-watch\.mp4/);
  assert.match(storefront, /heroVideoRef/);
  assert.match(storefront, /video\.currentTime = targetTime/);
  assert.match(storefront, /loading="lazy" decoding="async"/);
  assert.match(storefront, /localStorage\.setItem\("aurum-cart"/);
  assert.match(storefront, /const nextProducts = Array\.isArray\(data\.products\) \? data\.products : \[\]/);
  assert.match(storefront, /if \(cartHydrated\) window\.localStorage\.setItem/);
  assert.match(styles, /@media \(max-width:720px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /og\.png/);
  await access(new URL("public/og.png", root));
  await access(new URL("public/hero/aurum-watch.mp4", root));
  await Promise.all([
    "skmei-1146", "tuguir-tg1156", "skmei-2120-dourado", "skmei-2120-prata", "skmei-0992",
    "skmei-1649", "skmei-1335-dourado", "skmei-2049", "weide-wh5205",
  ].map((name) => access(new URL(`public/products/${name}.webp`, root))));
});

test("admin uses protected sessions and Vercel Blob persistence", async () => {
  const [adminPage, adminClient, auth, session, uploads, catalog, environment, vercel] = await Promise.all([
    read("app/admin/page.tsx"), read("app/admin/admin-dashboard.tsx"), read("lib/admin-auth.ts"),
    read("app/api/admin/session/route.ts"), read("app/api/uploads/route.ts"), read("lib/product-store.ts"),
    read(".env.example"), read("vercel.json"),
  ]);
  assert.match(adminPage, /requireAdminPage/);
  assert.match(adminClient, /@vercel\/blob\/client/);
  assert.match(adminClient, /optimizeProductImage/);
  assert.match(adminClient, /maxImageDimension = 1600/);
  assert.match(adminClient, /mutatingProductId/);
  assert.match(adminClient, /method: "PATCH"/);
  assert.match(auth, /AUTH_SECRET/);
  assert.match(session, /httpOnly: true/);
  assert.match(session, /sameSite: "strict"/);
  assert.match(uploads, /maximumSizeInBytes/);
  assert.match(catalog, /BLOB_READ_WRITE_TOKEN/);
  assert.match(adminClient, /storageConfigured/);
  assert.match(environment, /ADMIN_EMAIL=malagoligrowth@gmail\.com/);
  assert.equal(JSON.parse(vercel).framework, "nextjs");
});

test("cart survives reloads and respects the current inventory", () => {
  assert.deepEqual(readStoredCart(JSON.stringify({ atlas: 2, invalid: -1, decimal: 1.5 })), { atlas: 2 });
  assert.deepEqual(readStoredCart("invalid-json"), {});
  assert.deepEqual(reconcileCart({ atlas: 5, removed: 1 }, [{ id: "atlas", stock: 3 }]), { atlas: 3 });
  assert.deepEqual(updateCartQuantity({ atlas: 1 }, { id: "atlas", stock: 2 }, 1), { atlas: 2 });
  assert.deepEqual(updateCartQuantity({ atlas: 1 }, { id: "atlas", stock: 2 }, -1), {});
});
