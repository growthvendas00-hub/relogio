import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3101";
const password = process.env.TEST_ADMIN_PASSWORD ?? "TesteSeguro123!";
const originHeaders = { origin: base, "sec-fetch-site": "same-origin" };

async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  return { response, body };
}

function jsonOptions(body, headers = {}) {
  return { method: "POST", headers: { ...originHeaders, "content-type": "application/json", ...headers }, body: JSON.stringify(body) };
}

const home = await call("/");
assert.equal(home.response.status, 200);
assert.match(String(home.body), /ALMARE/);
assert.equal(home.response.headers.get("x-frame-options"), "DENY");
assert.equal(home.response.headers.get("cross-origin-resource-policy"), "same-origin");

const publicProducts = await call("/api/products");
assert.equal(publicProducts.response.status, 200);
assert.match(publicProducts.response.headers.get("cache-control") ?? "", /s-maxage=30/);
const product = publicProducts.body.products.find((item) => item.id === "skmei-1146") ?? publicProducts.body.products[0];
assert.ok(product);

const publicSettings = await call("/api/settings");
assert.equal(publicSettings.response.status, 200);
assert.match(publicSettings.response.headers.get("cache-control") ?? "", /s-maxage=30/);

for (const path of ["/api/orders", "/api/products?all=1", "/api/settings?admin=1"]) {
  assert.equal((await call(path)).response.status, 403);
}

assert.equal((await call("/api/orders", jsonOptions({ consent: true, items: [] }, { origin: "https://attacker.example", "sec-fetch-site": "cross-site" }))).response.status, 403);
assert.equal((await call("/api/orders", { method: "POST", headers: originHeaders, body: "{}" })).response.status, 415);
assert.equal((await call("/api/orders", { method: "POST", headers: { ...originHeaders, "content-type": "application/json" }, body: "{broken" })).response.status, 400);
assert.equal((await call("/api/orders", { method: "POST", headers: { ...originHeaders, "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.2" }, body: JSON.stringify({ padding: "x".repeat(70_000) }) })).response.status, 413);

const validAddress = { postalCode: "29300000", street: "Rua da Entrega", number: "123", complement: "Apto 4", district: "Centro", city: "Cachoeiro de Itapemirim", state: "ES" };
const invalidBase = { customerName: "Cliente Teste", whatsapp: "28999998888", instagram: "cliente.teste", consent: true, website: "", address: validAddress };
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, customerName: "<script>alert(1)</script>", items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.3" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, whatsapp: "123", items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.4" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, consent: false, items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.5" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, items: [{ productId: "does-not-exist", quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.6" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, items: [{ productId: product.id, quantity: 60 }, { productId: product.id, quantity: 60 }] }, { "x-vercel-forwarded-for": "203.0.113.7" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, address: undefined, items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.10" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, address: { ...validAddress, postalCode: "00000-000" }, items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.11" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, address: { ...validAddress, state: "XX" }, items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.12" }))).response.status, 400);
assert.equal((await call("/api/orders", jsonOptions({ website: "bot-field", items: [] }, { "x-vercel-forwarded-for": "203.0.113.8" }))).response.status, 202);

const validOrder = await call("/api/orders", jsonOptions({ ...invalidBase, priceCents: 1, items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.9" }));
assert.equal(validOrder.response.status, 201);
assert.equal(validOrder.body.order.items[0].unitPriceCents, product.priceCents);
assert.notEqual(validOrder.body.order.totalCents, 1);
assert.deepEqual(validOrder.body.order.customer.address, validAddress);

const rateResults = await Promise.all(Array.from({ length: 9 }, (_, index) => call("/api/orders", jsonOptions({ ...invalidBase, consent: false, items: [{ productId: product.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.88", "x-test-attempt": String(index) }))));
assert.equal(rateResults.filter((result) => result.response.status === 429).length, 1);

const login = await call("/api/admin/session", jsonOptions({ password }, { "x-vercel-forwarded-for": "203.0.113.100" }));
assert.equal(login.response.status, 200);
const session = /aurum_admin_session=([^;]+)/.exec(login.response.headers.get("set-cookie") ?? "")?.[1];
assert.ok(session);
const adminHeaders = { ...originHeaders, cookie: `aurum_admin_session=${session}` };
assert.equal((await call("/api/orders", { headers: { ...adminHeaders, cookie: `${adminHeaders.cookie}tampered` } })).response.status, 403);

const failedLogins = await Promise.all(Array.from({ length: 6 }, () => call("/api/admin/session", jsonOptions({ password: "senha-incorreta" }, { "x-vercel-forwarded-for": "203.0.113.101" }))));
assert.equal(failedLogins.filter((result) => result.response.status === 429).length, 1);

const allProducts = await call("/api/products?all=1", { headers: adminHeaders });
assert.equal(allProducts.response.status, 200);
const editable = allProducts.body.products.find((item) => item.id === "atlas-black") ?? allProducts.body.products[0];
const patchHeaders = { ...adminHeaders, "content-type": "application/json" };
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: { ...patchHeaders, origin: "https://attacker.example", "sec-fetch-site": "cross-site" }, body: JSON.stringify({ active: false }) })).response.status, 403);
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ slug: "../../invalid" }) })).response.status, 400);
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ active: false }) })).response.status, 200);
assert.equal((await call("/api/products")).body.products.some((item) => item.id === editable.id), false);
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ active: true, priceCents: editable.priceCents + 100 }) })).response.status, 200);
const edited = await call("/api/products?all=1", { headers: adminHeaders });
assert.equal(edited.body.products.find((item) => item.id === editable.id).priceCents, editable.priceCents + 100);
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ priceCents: editable.priceCents }) })).response.status, 200);
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ stock: 0 }) })).response.status, 200);
const soldOutCatalog = await call("/api/products");
assert.equal(soldOutCatalog.body.products.find((item) => item.id === editable.id)?.stock, 0);
assert.equal((await call("/api/orders", jsonOptions({ ...invalidBase, items: [{ productId: editable.id, quantity: 1 }] }, { "x-vercel-forwarded-for": "203.0.113.13" }))).response.status, 400);
assert.equal((await call(`/api/products/${editable.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ stock: editable.stock }) })).response.status, 200);

const adminSettings = await call("/api/settings?admin=1", { headers: adminHeaders });
assert.equal(adminSettings.response.status, 200);
const toggledMode = adminSettings.body.settings.orderMode === "store_followup" ? "customer_whatsapp" : "store_followup";
assert.equal((await call("/api/settings", { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ ...adminSettings.body.settings, orderMode: toggledMode }) })).response.status, 200);
assert.equal((await call("/api/settings", { method: "PATCH", headers: patchHeaders, body: JSON.stringify(adminSettings.body.settings) })).response.status, 200);

assert.equal((await call(`/api/orders/${validOrder.body.order.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ status: "invalid" }) })).response.status, 400);
assert.equal((await call(`/api/orders/${validOrder.body.order.id}`, { method: "PATCH", headers: patchHeaders, body: JSON.stringify({ status: "paid" }) })).response.status, 200);
const manual = await call("/api/orders", { ...jsonOptions({ manual: true, customerName: "Venda Externa", whatsapp: "28988887777", instagram: "", description: "1x Relógio externo", totalCents: 19990, status: "paid", notes: "Auditoria" }), headers: patchHeaders });
assert.equal(manual.response.status, 201);
assert.equal(manual.body.order.source, "manual");

const concurrentStart = performance.now();
const concurrentOrders = await Promise.all(Array.from({ length: 25 }, (_, index) => call("/api/orders", jsonOptions({
  customerName: `Cliente Carga ${String.fromCharCode(65 + index)}`,
  whatsapp: String(28990000000 + index),
  instagram: "",
  consent: true,
  website: "",
  address: validAddress,
  items: [{ productId: editable.id, quantity: 1 }],
}, { "x-vercel-forwarded-for": `198.51.100.${index + 1}` }))));
assert.equal(concurrentOrders.filter((result) => result.response.status === 201).length, 25);
const concurrentOrderDurationMs = Math.round(performance.now() - concurrentStart);

const latencies = [];
const reads = await Promise.all(Array.from({ length: 100 }, async () => {
  const started = performance.now();
  const result = await call("/api/products");
  latencies.push(performance.now() - started);
  return result.response.status;
}));
assert.equal(reads.every((status) => status === 200), true);
latencies.sort((a, b) => a - b);

const orders = await call("/api/orders", { headers: adminHeaders });
assert.equal(orders.response.status, 200);
assert.ok(orders.body.orders.length >= 27);

console.log(JSON.stringify({
  checked: "storefront, sold-out state, delivery address, auth, CSRF, XSS input, size limits, stock aggregation, price integrity, IDOR, admin mutations, rate limits, concurrency",
  concurrentOrders: 25,
  concurrentOrderDurationMs,
  publicReads: 100,
  publicReadP95Ms: Math.round(latencies[Math.floor(latencies.length * 0.95)]),
  storedOrders: orders.body.orders.length,
}, null, 2));
