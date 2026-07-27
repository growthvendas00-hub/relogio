export type OrderMode = "store_followup" | "customer_whatsapp";
export type OrderStatus = "new" | "contacted" | "confirmed" | "paid" | "cancelled";
export type OrderSource = "site_followup" | "site_whatsapp" | "manual";

export type StoreSettings = {
  brandName: string;
  instagramUrl: string;
  orderMode: OrderMode;
  storeWhatsapp: string;
  customerWhatsappTemplate: string;
  followupWhatsappTemplate: string;
};

export type OrderItem = {
  productId: string | null;
  name: string;
  simplifiedName: string;
  quantity: number;
  unitPriceCents: number;
};

export type ShippingAddress = {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export type Order = {
  id: string;
  code: string;
  customer: { name: string; instagram: string; whatsapp: string; address?: ShippingAddress };
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: OrderStatus;
  source: OrderSource;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const defaultStoreSettings: StoreSettings = {
  brandName: "Almare",
  instagramUrl: "https://www.instagram.com/almare.old/",
  orderMode: "store_followup",
  storeWhatsapp: "5528999187401",
  customerWhatsappTemplate: "Olá! Quero finalizar meu pedido na Almare:\n\n{itens}\n\nTotal: {total}\nEntrega: {entrega}\nEndereço: {endereco}\n\nMeu nome é {nome}.",
  followupWhatsappTemplate: "Oi {nome}, tudo certo? Estou passando para finalizarmos seu pedido:\n\n{itens}\n\nTotal: {total}\nEndereço de entrega: {endereco}\n\nConfirma para mim se está tudo certo, por favor?",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "Novo",
  contacted: "Contato iniciado",
  confirmed: "Confirmado",
  paid: "Pago",
  cancelled: "Cancelado",
};

export const money = (cents: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(cents / 100);

export function simplifyProductName(name: string) {
  return name.split(/\s+[—–-]\s+(?=(?:Prata|Preto|Dourado|Azul|Vermelho|Marrom|Rose|Rosé)\b)/i)[0].trim();
}

export function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function validWhatsapp(value: string) {
  const digits = normalizeWhatsapp(value);
  return /^55\d{10,11}$/.test(digits);
}

export function normalizeInstagram(value: string) {
  return value.trim().replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "");
}

export function renderOrderItems(items: OrderItem[]) {
  return items.map((item) => `${item.quantity}x ${item.simplifiedName} — ${money(item.unitPriceCents * item.quantity)}`).join("\n");
}

export function formatShippingAddress(address?: ShippingAddress) {
  if (!address) return "Não informado";
  const complement = address.complement ? `, ${address.complement}` : "";
  return `${address.street}, ${address.number}${complement} — ${address.district}, ${address.city}/${address.state} — CEP ${address.postalCode.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`;
}

export function renderOrderMessage(template: string, order: Pick<Order, "customer" | "items" | "totalCents" | "shippingCents" | "code">) {
  const replacements: Record<string, string> = {
    nome: order.customer.name.split(/\s+/)[0],
    nome_completo: order.customer.name,
    itens: renderOrderItems(order.items),
    total: money(order.totalCents),
    entrega: order.shippingCents === 0 ? "Frete grátis" : order.shippingCents > 0 ? money(order.shippingCents) : "A combinar",
    pedido: order.code,
    endereco: formatShippingAddress(order.customer.address),
  };
  return template.replace(/\{(nome|nome_completo|itens|total|entrega|pedido|endereco)\}/g, (_, key: string) => replacements[key]);
}
