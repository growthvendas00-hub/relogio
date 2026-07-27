import { getAdminUser } from "@/lib/admin-auth";
import { defaultStoreSettings, validWhatsapp, type OrderMode, type StoreSettings } from "@/lib/commerce";
import { commerceStorageConfigured, getStoreSettings, saveStoreSettings } from "@/lib/commerce-store";
import { isAllowedMutationOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const settings = await getStoreSettings();
    const admin = new URL(request.url).searchParams.get("admin") === "1";
    if (admin && !(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
    if (admin) return Response.json({ settings, storageConfigured: commerceStorageConfigured() });
    return Response.json({ settings: {
      brandName: settings.brandName,
      instagramUrl: settings.instagramUrl,
      orderMode: settings.orderMode,
      storeWhatsapp: settings.storeWhatsapp,
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as configurações." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAllowedMutationOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!(await getAdminUser())) return Response.json({ error: "Acesso não autorizado." }, { status: 403 });
  try {
    const payload = await request.json() as Partial<StoreSettings>;
    const current = await getStoreSettings();
    const settings: StoreSettings = {
      brandName: String(payload.brandName ?? current.brandName).trim(),
      instagramUrl: String(payload.instagramUrl ?? current.instagramUrl).trim(),
      orderMode: String(payload.orderMode ?? current.orderMode) as OrderMode,
      storeWhatsapp: String(payload.storeWhatsapp ?? current.storeWhatsapp).replace(/\D/g, ""),
      customerWhatsappTemplate: String(payload.customerWhatsappTemplate ?? current.customerWhatsappTemplate).trim(),
      followupWhatsappTemplate: String(payload.followupWhatsappTemplate ?? current.followupWhatsappTemplate).trim(),
    };
    if (!settings.brandName || settings.brandName.length > 50) throw new Error("Nome da loja inválido.");
    if (!/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/.test(settings.instagramUrl)) throw new Error("Link do Instagram inválido.");
    if (!validWhatsapp(settings.storeWhatsapp)) throw new Error("WhatsApp da loja inválido.");
    if (!(["store_followup", "customer_whatsapp"] as string[]).includes(settings.orderMode)) throw new Error("Modo de pedido inválido.");
    for (const template of [settings.customerWhatsappTemplate, settings.followupWhatsappTemplate]) {
      if (!template || template.length > 3000 || !template.includes("{itens}") || !template.includes("{total}")) {
        throw new Error("As mensagens precisam conter {itens} e {total} e ter até 3.000 caracteres.");
      }
    }
    return Response.json({ settings: await saveStoreSettings(settings) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as configurações." }, { status: 400 });
  }
}

export { defaultStoreSettings };
