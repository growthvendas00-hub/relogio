import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { readStoredCart, reconcileCart, updateCartQuantity } from "../lib/cart.ts";
import { isAllowedMutationOrigin, isSafeProductImage } from "../lib/request-security.ts";
import { defaultStoreSettings, renderOrderMessage, simplifyProductName } from "../lib/commerce.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("storefront includes the MVP sales flow", async () => {
  const [storefront, styles, layout, commerce] = await Promise.all([read("app/storefront.tsx"), read("app/globals.css"), read("app/layout.tsx"), read("lib/commerce.ts")]);
  assert.match(storefront, /ALMARE/);
  assert.match(commerce, /5528999187401/);
  assert.match(commerce, /instagram\.com\/almare\.old/);
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

test("admin uses protected sessions and confirmed Vercel Blob persistence", async () => {
  const [adminPage, adminClient, auth, session, uploads, catalog, security, config, environment, vercel] = await Promise.all([
    read("app/admin/page.tsx"), read("app/admin/admin-dashboard.tsx"), read("lib/admin-auth.ts"),
    read("app/api/admin/session/route.ts"), read("app/api/uploads/route.ts"), read("lib/product-store.ts"),
    read("lib/request-security.ts"), read("next.config.ts"), read(".env.example"), read("vercel.json"),
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
  assert.match(session, /consumeLoginAttempt/);
  assert.match(uploads, /maximumSizeInBytes/);
  assert.match(uploads, /export async function DELETE/);
  assert.match(catalog, /BLOB_READ_WRITE_TOKEN/);
  assert.match(catalog, /BLOB_STORE_ID/);
  assert.match(catalog, /await del\(obsolete\)\.catch/);
  assert.match(adminClient, /storageConfigured/);
  assert.match(adminClient, /atualizado e confirmado/);
  assert.match(adminClient, /priceCents === null/);
  assert.match(security, /sec-fetch-site/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /poweredByHeader: false/);
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

test("mutation origins and product image references are restricted", () => {
  const sameOrigin = new Request("https://aurum.example/api/products/1", {
    method: "PATCH",
    headers: { origin: "https://aurum.example", "sec-fetch-site": "same-origin" },
  });
  const crossOrigin = new Request("https://aurum.example/api/products/1", {
    method: "PATCH",
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  });
  assert.equal(isAllowedMutationOrigin(sameOrigin), true);
  assert.equal(isAllowedMutationOrigin(crossOrigin), false);
  assert.equal(isSafeProductImage("/products/watch.webp"), true);
  assert.equal(isSafeProductImage("/products/../secret.webp"), false);
  assert.equal(isSafeProductImage("javascript:alert(1)"), false);
  assert.equal(isSafeProductImage(
    "https://store.public.blob.vercel-storage.com/products/watch.webp",
    "products/watch.webp",
  ), true);
  assert.equal(isSafeProductImage(
    "http://store.public.blob.vercel-storage.com/products/watch.webp",
    "products/watch.webp",
  ), false);
});

test("orders keep simplified product names and editable message templates", () => {
  assert.equal(simplifyProductName("Relógio Masculino SKMEI AnaDigi 1146 — Prata e Preto"), "Relógio Masculino SKMEI AnaDigi 1146");
  const rendered = renderOrderMessage(defaultStoreSettings.followupWhatsappTemplate, {
    code: "ALM-TESTE",
    customer: { name: "João da Silva", whatsapp: "5528999999999", instagram: "joao" },
    items: [{ productId: "watch", name: "Relógio Masculino SKMEI AnaDigi 1146 — Prata e Preto", simplifiedName: "Relógio Masculino SKMEI AnaDigi 1146", quantity: 1, unitPriceCents: 24990 }],
    totalCents: 24990,
  });
  assert.match(rendered, /Oi João/);
  assert.match(rendered, /1x Relógio Masculino SKMEI AnaDigi 1146 — R\$\s249,90/);
  assert.doesNotMatch(rendered, /Prata e Preto/);
});

test("commercial management validates prices server-side and protects customer data", async () => {
  const [ordersRoute, orderRoute, settingsRoute, store, dashboard] = await Promise.all([
    read("app/api/orders/route.ts"), read("app/api/orders/[id]/route.ts"), read("app/api/settings/route.ts"),
    read("lib/commerce-store.ts"), read("app/admin/commerce-dashboard.tsx"),
  ]);
  assert.match(ordersRoute, /await listProducts\(false\)/);
  assert.match(ordersRoute, /unitPriceCents: product\.priceCents/);
  assert.match(ordersRoute, /consumeOrderAttempt/);
  assert.match(orderRoute, /await getAdminUser\(\)/);
  assert.match(settingsRoute, /await getAdminUser\(\)/);
  assert.match(store, /AES-GCM/);
  assert.match(store, /CUSTOMER_DATA_SECRET \|\| process\.env\.AUTH_SECRET/);
  assert.match(dashboard, /Faturamento pago/);
  assert.match(dashboard, /Registrar venda manual/);
  assert.match(dashboard, /Chamar no WhatsApp/);
});
