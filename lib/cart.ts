export type CartState = Record<string, number>;

type InventoryItem = {
  id: string;
  stock: number;
};

export function sanitizeCart(value: unknown): CartState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, quantity]) => id.length > 0 && Number.isInteger(quantity) && Number(quantity) > 0)
      .map(([id, quantity]) => [id, Number(quantity)]),
  );
}

export function readStoredCart(serialized: string | null): CartState {
  if (!serialized) return {};
  try {
    return sanitizeCart(JSON.parse(serialized));
  } catch {
    return {};
  }
}

export function reconcileCart(cart: CartState, products: InventoryItem[]): CartState {
  const inventory = new Map(products.map((product) => [product.id, Math.max(0, Math.floor(product.stock))]));
  const next: CartState = {};

  for (const [id, quantity] of Object.entries(cart)) {
    const stock = inventory.get(id) ?? 0;
    if (stock > 0) next[id] = Math.min(stock, quantity);
  }

  return next;
}

export function updateCartQuantity(cart: CartState, product: InventoryItem, delta: number): CartState {
  const stock = Math.max(0, Math.floor(product.stock));
  const quantity = Math.max(0, Math.min(stock, (cart[product.id] ?? 0) + delta));
  const next = { ...cart };

  if (quantity === 0) delete next[product.id];
  else next[product.id] = quantity;

  return next;
}
