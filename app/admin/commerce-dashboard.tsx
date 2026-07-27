"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultStoreSettings, money, normalizeWhatsapp, orderStatusLabels, renderOrderMessage, type Order, type OrderStatus, type StoreSettings } from "@/lib/commerce";

export type AdminView = "dashboard" | "orders" | "customers" | "settings";

const sourceLabels: Record<Order["source"], string> = {
  site_followup: "Site · Almare chama",
  site_whatsapp: "Site · cliente chama",
  manual: "Venda manual",
};

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\s/g, "");
  const decimal = normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized;
  if (!/^\d+(?:\.\d{1,2})?$/.test(decimal)) return null;
  const cents = Math.round(Number(decimal) * 100);
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function CommerceDashboard({ view }: { view: AdminView }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ customerName: "", whatsapp: "", instagram: "", description: "", total: "", notes: "", paid: true });

  useEffect(() => {
    Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/settings?admin=1", { cache: "no-store" }),
    ]).then(async ([ordersResponse, settingsResponse]) => {
      const [ordersData, settingsData] = await Promise.all([ordersResponse.json(), settingsResponse.json()]);
      if (!ordersResponse.ok) throw new Error(ordersData.error);
      if (!settingsResponse.ok) throw new Error(settingsData.error);
      setOrders(ordersData.orders);
      setSettings(settingsData.settings);
    }).catch((error) => {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível carregar a gestão." });
    }).finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const paid = orders.filter((order) => order.status === "paid");
    const active = orders.filter((order) => order.status !== "cancelled");
    return {
      revenue: paid.reduce((sum, order) => sum + order.totalCents, 0),
      total: active.length,
      pending: orders.filter((order) => order.status === "new" || order.status === "contacted").length,
      customers: new Set(orders.map((order) => normalizeWhatsapp(order.customer.whatsapp))).size,
      average: paid.length ? Math.round(paid.reduce((sum, order) => sum + order.totalCents, 0) / paid.length) : 0,
    };
  }, [orders]);

  const customers = useMemo(() => {
    const grouped = new Map<string, { name: string; whatsapp: string; instagram: string; orders: number; paidCents: number; lastOrder: string }>();
    for (const order of [...orders].reverse()) {
      const key = normalizeWhatsapp(order.customer.whatsapp);
      const current = grouped.get(key);
      grouped.set(key, {
        name: order.customer.name || current?.name || "Cliente",
        whatsapp: key,
        instagram: order.customer.instagram || current?.instagram || "",
        orders: (current?.orders ?? 0) + 1,
        paidCents: (current?.paidCents ?? 0) + (order.status === "paid" ? order.totalCents : 0),
        lastOrder: !current || order.createdAt > current.lastOrder ? order.createdAt : current.lastOrder,
      });
    }
    return [...grouped.values()].sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
  }, [orders]);

  async function updateStatus(order: Order, status: OrderStatus) {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrders((current) => current.map((item) => item.id === order.id ? data.order : item));
      setNotice({ type: "success", text: `${order.code} atualizado para ${orderStatusLabels[status]}.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível atualizar o pedido." });
    } finally { setSaving(false); }
  }

  function contact(order: Order) {
    const message = renderOrderMessage(settings.followupWhatsappTemplate, order);
    window.open(`https://wa.me/${normalizeWhatsapp(order.customer.whatsapp)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    if (order.status === "new") void updateStatus(order, "contacted");
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(data.settings);
      setNotice({ type: "success", text: "Configurações da Almare salvas." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." }); }
    finally { setSaving(false); }
  }

  async function createManualSale(event: React.FormEvent) {
    event.preventDefault();
    const totalCents = parseMoney(manual.total);
    if (totalCents === null) { setNotice({ type: "error", text: "Informe o valor no formato 249,90." }); return; }
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          manual: true,
          customerName: manual.customerName,
          whatsapp: manual.whatsapp,
          instagram: manual.instagram,
          description: manual.description,
          totalCents,
          notes: manual.notes,
          status: manual.paid ? "paid" : "confirmed",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrders((current) => [data.order, ...current]);
      setManual({ customerName: "", whatsapp: "", instagram: "", description: "", total: "", notes: "", paid: true });
      setManualOpen(false);
      setNotice({ type: "success", text: `Venda ${data.order.code} registrada.` });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível registrar a venda." }); }
    finally { setSaving(false); }
  }

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((order) => order.status === statusFilter);
  const title = view === "dashboard" ? "Visão geral" : view === "orders" ? "Pedidos" : view === "customers" ? "Clientes" : "Configurações";

  return <section className="admin-main admin-commerce">
    <header className="admin-header"><div><span>Gestão Almare</span><h1>{title}</h1><p>Acompanhe pedidos, clientes, faturamento e atendimento.</p></div>{(view === "dashboard" || view === "orders") && <button className="button primary" onClick={() => setManualOpen(true)}>Registrar venda <b>+</b></button>}</header>
    {notice && <div className={`admin-notice ${notice.type}`} role="status">{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
    {loading ? <div className="admin-loading">Carregando gestão...</div> : <>
      {view === "dashboard" && <>
        <div className="commerce-metrics"><article><span>Faturamento pago</span><strong>{money(metrics.revenue)}</strong></article><article><span>Pedidos</span><strong>{metrics.total}</strong></article><article><span>Aguardando contato</span><strong>{metrics.pending}</strong></article><article><span>Clientes</span><strong>{metrics.customers}</strong></article><article><span>Ticket médio</span><strong>{money(metrics.average)}</strong></article></div>
        <div className="admin-table-wrap"><div className="admin-table-heading"><h2>Pedidos recentes</h2><span>{orders.length} registrados</span></div><OrderList orders={orders.slice(0, 6)} saving={saving} onStatus={updateStatus} onContact={contact} /></div>
      </>}
      {view === "orders" && <div className="admin-table-wrap"><div className="admin-table-heading commerce-heading"><h2>Todos os pedidos</h2><label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Todos</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><OrderList orders={filteredOrders} saving={saving} onStatus={updateStatus} onContact={contact} /></div>}
      {view === "customers" && <div className="admin-table-wrap"><div className="admin-table-heading"><h2>Base de clientes</h2><span>{customers.length} contatos</span></div>{customers.length ? <div className="customer-list">{customers.map((customer) => <article key={customer.whatsapp}><div><strong>{customer.name}</strong><span>{customer.instagram ? `@${customer.instagram}` : "Sem Instagram"}</span></div><a href={`https://wa.me/${customer.whatsapp}`} target="_blank" rel="noreferrer">+{customer.whatsapp}</a><div><span>Último pedido</span><strong>{formatDate(customer.lastOrder)}</strong></div><div><span>Pedidos</span><strong>{customer.orders}</strong></div><div><span>Total pago</span><strong>{money(customer.paidCents)}</strong></div></article>)}</div> : <Empty text="Os clientes aparecerão aqui após o primeiro pedido." />}</div>}
      {view === "settings" && <form className="settings-panel" onSubmit={saveSettings}><section><span>Atendimento do site</span><h2>Como o pedido termina</h2><div className="mode-options"><label><input type="radio" name="mode" checked={settings.orderMode === "store_followup"} onChange={() => setSettings({ ...settings, orderMode: "store_followup" })} /><div><strong>A Almare chama o cliente</strong><p>O pedido entra no painel e você inicia o atendimento.</p></div></label><label><input type="radio" name="mode" checked={settings.orderMode === "customer_whatsapp"} onChange={() => setSettings({ ...settings, orderMode: "customer_whatsapp" })} /><div><strong>Cliente chama no WhatsApp</strong><p>O pedido é salvo e o WhatsApp abre com a mensagem pronta.</p></div></label></div></section><section><span>Marca e contatos</span><div className="settings-grid"><label><b>Nome da loja</b><input value={settings.brandName} onChange={(event) => setSettings({ ...settings, brandName: event.target.value })} /></label><label><b>WhatsApp da loja</b><input inputMode="tel" value={settings.storeWhatsapp} onChange={(event) => setSettings({ ...settings, storeWhatsapp: event.target.value })} /></label><label className="full"><b>Instagram</b><input value={settings.instagramUrl} onChange={(event) => setSettings({ ...settings, instagramUrl: event.target.value })} /></label></div></section><section><span>Mensagens prontas</span><label className="template-field"><b>Mensagem quando o cliente chama</b><textarea rows={8} value={settings.customerWhatsappTemplate} onChange={(event) => setSettings({ ...settings, customerWhatsappTemplate: event.target.value })} /></label><label className="template-field"><b>Mensagem para chamar o cliente</b><textarea rows={8} value={settings.followupWhatsappTemplate} onChange={(event) => setSettings({ ...settings, followupWhatsappTemplate: event.target.value })} /></label><p className="template-help">Variáveis disponíveis: {`{nome}, {nome_completo}, {itens}, {total}, {entrega}, {pedido}`}. Mantenha {`{itens}`} e {`{total}`}.</p></section><button className="button primary" disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</button></form>}
    </>}
    {manualOpen && <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Registrar venda manual"><button className="modal-backdrop" onClick={() => !saving && setManualOpen(false)} aria-label="Fechar" /><form className="manual-sale-modal" onSubmit={createManualSale}><button type="button" className="close-button" onClick={() => setManualOpen(false)}>×</button><span>Venda externa</span><h2>Registrar venda manual</h2><p>Inclua vendas feitas no Instagram, presencialmente ou por indicação.</p><div className="settings-grid"><label><b>Cliente *</b><input required value={manual.customerName} onChange={(event) => setManual({ ...manual, customerName: event.target.value })} /></label><label><b>WhatsApp *</b><input required inputMode="tel" value={manual.whatsapp} onChange={(event) => setManual({ ...manual, whatsapp: event.target.value })} /></label><label><b>@ Instagram</b><input value={manual.instagram} onChange={(event) => setManual({ ...manual, instagram: event.target.value })} /></label><label><b>Valor total *</b><input required inputMode="decimal" placeholder="249,90" value={manual.total} onChange={(event) => setManual({ ...manual, total: event.target.value })} /></label><label className="full"><b>Produtos vendidos *</b><input required placeholder="Ex.: 1x SKMEI 1146" value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} /></label><label className="full"><b>Observações</b><textarea rows={3} value={manual.notes} onChange={(event) => setManual({ ...manual, notes: event.target.value })} /></label></div><label className="manual-paid"><input type="checkbox" checked={manual.paid} onChange={(event) => setManual({ ...manual, paid: event.target.checked })} /> Venda já recebida/paga</label><button className="button primary full" disabled={saving}>{saving ? "Registrando..." : "Registrar venda"}</button></form></div>}
  </section>;
}

function OrderList({ orders, saving, onStatus, onContact }: { orders: Order[]; saving: boolean; onStatus: (order: Order, status: OrderStatus) => void; onContact: (order: Order) => void }) {
  if (!orders.length) return <Empty text="Nenhum pedido encontrado." />;
  return <div className="commerce-orders">{orders.map((order) => <article className="commerce-order" key={order.id}><header><div><span>{sourceLabels[order.source]}</span><strong>{order.code}</strong><small>{formatDate(order.createdAt)}</small></div><select disabled={saving} value={order.status} aria-label={`Status do pedido ${order.code}`} onChange={(event) => onStatus(order, event.target.value as OrderStatus)}>{Object.entries(orderStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></header><div className="order-customer"><strong>{order.customer.name}</strong><a href={`https://wa.me/${normalizeWhatsapp(order.customer.whatsapp)}`} target="_blank" rel="noreferrer">+{normalizeWhatsapp(order.customer.whatsapp)}</a>{order.customer.instagram && <a href={`https://instagram.com/${order.customer.instagram}`} target="_blank" rel="noreferrer">@{order.customer.instagram}</a>}</div><div className="order-items">{order.items.map((item, index) => <p key={`${item.productId}-${index}`}><span>{item.quantity}x {item.simplifiedName}</span><strong>{money(item.unitPriceCents * item.quantity)}</strong></p>)}</div><footer><div><span>Total</span><strong>{money(order.totalCents)}</strong></div><button className="button primary" onClick={() => onContact(order)}>Chamar no WhatsApp <span>↗</span></button></footer></article>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="admin-empty"><h3>Nada por aqui ainda.</h3><p>{text}</p></div>;
}
