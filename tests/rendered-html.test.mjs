import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("storefront includes the MVP sales flow", async () => {
  const [storefront, styles, layout] = await Promise.all([read("app/storefront.tsx"), read("app/globals.css"), read("app/layout.tsx")]);
  assert.match(storefront, /AURUM/);
  assert.match(storefront, /5528999187401/);
  assert.match(storefront, /40000/);
  assert.match(storefront, /Garantia de 30 dias/);
  assert.match(storefront, /Envio imediato/);
  assert.match(storefront, /\/hero\/aurum-watch\.mp4/);
  assert.match(storefront, /heroVideoRef/);
  assert.match(storefront, /video\.currentTime = targetTime/);
  assert.match(storefront, /loading="lazy" decoding="async"/);
  assert.match(storefront, /localStorage\.setItem\("aurum-cart"/);
  assert.match(styles, /@media \(max-width:720px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /og\.png/);
  await access(new URL("public/og.png", root));
  await access(new URL("public/hero/aurum-watch.mp4", root));
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
  assert.match(environment, /ADMIN_EMAIL=malagoligrowth@gmail\.com/);
  assert.equal(JSON.parse(vercel).framework, "nextjs");
});
