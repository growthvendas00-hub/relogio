import { getAdminUser } from "@/lib/admin-auth";
import { orderStatusLabels, type OrderStatus } from "@/lib/commerce";
import { updateOrder } from "@/lib/commerce-store";
import { isAllowedMutationOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
  try {
    const payload = await request.json() as { status?: unknown; notes?: unknown };
    const changes: { status?: OrderStatus; notes?: string } = {};
    if (payload.status !== undefined) {
      if (typeof payload.status !== "string" || !(payload.status in orderStatusLabels)) throw new Error("Status de pedido inválido.");
      changes.status = payload.status as OrderStatus;
    }
    if (payload.notes !== undefined) {
      if (typeof payload.notes !== "string" || payload.notes.length > 1000) throw new Error("Observação inválida.");
      changes.notes = payload.notes.trim();
    }
    if (!Object.keys(changes).length) throw new Error("Nenhuma alteração informada.");
    const { id } = await context.params;
    const order = await updateOrder(id, changes);
    return order ? Response.json({ order }) : Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o pedido." }, { status: 400 });
  }
}
