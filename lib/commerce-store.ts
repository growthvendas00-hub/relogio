import "server-only";
import { list, put } from "@vercel/blob";
import { defaultStoreSettings, type Order, type OrderStatus, type StoreSettings } from "@/lib/commerce";

const ORDER_PREFIX = "almare/private/orders/";
const SETTINGS_PREFIX = "almare/settings/";
const useMemory = process.env.AURUM_TEST_STORAGE === "memory" && !process.env.VERCEL;
const memory = globalThis as typeof globalThis & { almareOrders?: Order[]; almareSettings?: StoreSettings };

type EncryptedRecord = { version: 1; iv: string; data: string };

function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) || useMemory;
}

function dataSecret() {
  const secret = process.env.CUSTOMER_DATA_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure CUSTOMER_DATA_SECRET ou AUTH_SECRET com pelo menos 32 caracteres.");
  return secret;
}

async function encryptionKey() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dataSecret()));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function encode(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function encryptOrder(order: Order): Promise<EncryptedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(JSON.stringify(order)));
  return { version: 1, iv: encode(iv), data: encode(new Uint8Array(encrypted)) };
}

async function decryptOrder(record: EncryptedRecord) {
  if (record.version !== 1 || !record.iv || !record.data) throw new Error("Registro de pedido inválido.");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(record.iv) }, await encryptionKey(), decode(record.data));
  return JSON.parse(new TextDecoder().decode(decrypted)) as Order;
}

async function listAll(prefix: string) {
  const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function writeOrder(order: Order) {
  if (!storageConfigured()) throw new Error("O armazenamento da loja ainda não está conectado.");
  if (useMemory) {
    const current = memory.almareOrders ?? [];
    memory.almareOrders = [...current.filter((item) => item.id !== order.id), structuredClone(order)];
    return order;
  }
  const safeTime = order.updatedAt.replace(/[:.]/g, "-");
  await put(`${ORDER_PREFIX}${order.id}/${safeTime}-${crypto.randomUUID()}.json`, JSON.stringify(await encryptOrder(order)), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  return order;
}

export async function listOrders() {
  if (!storageConfigured()) return [];
  if (useMemory) return structuredClone(memory.almareOrders ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const blobs = await listAll(ORDER_PREFIX);
  const latest = new Map<string, { pathname: string; uploadedAt: Date; url: string }>();
  for (const blob of blobs) {
    const id = blob.pathname.slice(ORDER_PREFIX.length).split("/")[0];
    const current = latest.get(id);
    if (!current || blob.uploadedAt > current.uploadedAt || (blob.uploadedAt.getTime() === current.uploadedAt.getTime() && blob.pathname > current.pathname)) {
      latest.set(id, blob);
    }
  }
  const orders = await Promise.all([...latest.values()].map(async (blob) => {
    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível ler um pedido armazenado.");
    return decryptOrder(await response.json() as EncryptedRecord);
  }));
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOrder(order: Order) {
  return writeOrder(order);
}

export async function updateOrder(id: string, changes: { status?: OrderStatus; notes?: string }) {
  const orders = await listOrders();
  const current = orders.find((order) => order.id === id);
  if (!current) return null;
  return writeOrder({ ...current, ...changes, id, updatedAt: new Date().toISOString() });
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (useMemory) return structuredClone(memory.almareSettings ?? defaultStoreSettings);
  if (!storageConfigured()) return defaultStoreSettings;
  const blobs = await listAll(SETTINGS_PREFIX);
  const latest = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime() || b.pathname.localeCompare(a.pathname))[0];
  if (!latest) return defaultStoreSettings;
  const response = await fetch(latest.url, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar as configurações da loja.");
  return { ...defaultStoreSettings, ...await response.json() as Partial<StoreSettings> };
}

export async function saveStoreSettings(settings: StoreSettings) {
  if (!storageConfigured()) throw new Error("O armazenamento da loja ainda não está conectado.");
  if (useMemory) {
    memory.almareSettings = structuredClone(settings);
    return settings;
  }
  await put(`${SETTINGS_PREFIX}${Date.now()}-${crypto.randomUUID()}.json`, JSON.stringify(settings), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
  return settings;
}

export const commerceStorageConfigured = storageConfigured;
