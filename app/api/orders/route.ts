import { getAdminUser } from "@/lib/admin-auth";
import { normalizeInstagram, normalizeWhatsapp, simplifyProductName, validWhatsapp, type Order } from "@/lib/commerce";
import { createOrder, getStoreSettings, listOrders } from "@/lib/commerce-store";
import { consumeOrderAttempt } from "@/lib/order-rate-limit";
import { listProducts } from "@/lib/product-store";
import { isAllowedMutationOrigin, readJsonBody, requestErrorStatus } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function text(value: unknown, max: number) {
  const result = String(value ?? "").trim();
  if (result.length > max) throw new Error("Um dos campos excede o limite permitido.");
  return result;
}

function singleLine(value: unknown, max: number) {
  return text(value, max).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function orderCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ALM-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function GET() {
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
  try {
    return Response.json({ orders: await listOrders() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os pedidos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  try {
    const payload = await readJsonBody<Record<string, unknown>>(request, 65_536);
    const admin = await getAdminUser();
    const manual = payload.manual === true;
    if (manual && !admin) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });

    if (!manual) {
      const limit = consumeOrderAttempt(request);
      if (!limit.allowed) return Response.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
      );
      if (payload.website) return Response.json({ received: true }, { status: 202 });
      if (payload.consent !== true) return Response.json({ error: "Confirme que a Almare pode entrar em contato." }, { status: 400 });
    }

    const customerName = singleLine(payload.customerName, 100);
    const whatsapp = normalizeWhatsapp(text(payload.whatsapp, 30));
    const instagram = normalizeInstagram(text(payload.instagram, 80));
    if (!customerName) throw new Error("Informe o nome do cliente.");
    if (!/^[\p{L}\p{M} .'-]{2,100}$/u.test(customerName)) throw new Error("Informe um nome válido, sem códigos ou símbolos especiais.");
    if (!validWhatsapp(whatsapp)) throw new Error("Informe um WhatsApp válido com DDD.");
    if (instagram && !/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) throw new Error("Informe um @ do Instagram válido.");

    let items: Order["items"];
    let subtotalCents: number;
    let source: Order["source"];
    let status: Order["status"] = "new";
    let notes = text(payload.notes, 1000);
    let checkoutSettings: Awaited<ReturnType<typeof getStoreSettings>> | null = null;

    if (manual) {
      const description = singleLine(payload.description, 180);
      const totalCents = payload.totalCents;
      if (!description) throw new Error("Descreva a venda manual.");
      if (typeof totalCents !== "number" || !Number.isInteger(totalCents) || totalCents <= 0 || totalCents > 100_000_000) {
        throw new Error("Informe um valor válido para a venda.");
      }
      items = [{ productId: null, name: description, simplifiedName: description, quantity: 1, unitPriceCents: totalCents }];
      subtotalCents = totalCents;
      source = "manual";
      status = payload.status === "paid" ? "paid" : "confirmed";
    } else {
      const rawItems = Array.isArray(payload.items) ? payload.items : [];
      if (!rawItems.length || rawItems.length > 30) throw new Error("O pedido precisa ter pelo menos um produto.");
      const quantities = new Map<string, number>();
      for (const raw of rawItems) {
        if (!raw || typeof raw !== "object") throw new Error("Um item do carrinho é inválido.");
        const input = raw as { productId?: unknown; quantity?: unknown };
        if (typeof input.productId !== "string" || input.productId.length > 140) throw new Error("Um item do carrinho é inválido.");
        const quantity = Number(input.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) throw new Error("A quantidade de um produto é inválida.");
        quantities.set(input.productId, (quantities.get(input.productId) ?? 0) + quantity);
      }
      const products = await listProducts(false);
      items = [...quantities.entries()].map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId);
        if (!product || !Number.isInteger(quantity) || quantity <= 0 || quantity > product.stock) {
          throw new Error("Um produto do carrinho está indisponível ou sem estoque suficiente.");
        }
        return {
          productId: product.id,
          name: product.name,
          simplifiedName: simplifyProductName(product.name),
          quantity,
          unitPriceCents: product.priceCents,
        };
      });
      subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
      checkoutSettings = await getStoreSettings();
      source = checkoutSettings.orderMode === "customer_whatsapp" ? "site_whatsapp" : "site_followup";
      notes = "";
    }

    const now = new Date().toISOString();
    const shippingCents = subtotalCents >= 40_000 ? 0 : -1;
    const order: Order = {
      id: crypto.randomUUID(),
      code: orderCode(),
      customer: { name: customerName, instagram, whatsapp },
      items,
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents,
      status,
      source,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    await createOrder(order);
    const settings = checkoutSettings ?? await getStoreSettings();
    return Response.json({ order, orderMode: settings.orderMode, storeWhatsapp: settings.storeWhatsapp, customerWhatsappTemplate: settings.customerWhatsappTemplate }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar o pedido." }, { status: requestErrorStatus(error, 400) });
  }
}
