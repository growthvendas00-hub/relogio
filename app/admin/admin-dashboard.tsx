"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";

type Product = {
  id: string; slug: string; name: string; eyebrow: string; description: string;
  priceCents: number; compareAtPriceCents: number | null; stock: number; category: string;
  caseColor: string; strap: string; movement: string; waterResistance: string;
  imageUrl: string; imageKey: string | null; featured: boolean; active: boolean;
};

type FormState = Omit<Product, "id" | "slug" | "priceCents" | "compareAtPriceCents"> & {
  id?: string; price: string; compareAtPrice: string;
};

const blank: FormState = {
  name: "", eyebrow: "Coleção Urbana", description: "", price: "", compareAtPrice: "", stock: 1,
  category: "Casual", caseColor: "Preto", strap: "Aço", movement: "Quartzo japonês",
  waterResistance: "3 ATM", imageUrl: "", imageKey: null, featured: false, active: true,
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const toCents = (value: string) => {
  const normalized = value.trim().replace(/\s/g, "");
  const decimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
  if (!/^\d+(?:\.\d{1,2})?$/.test(decimal)) return null;
  const cents = Math.round(Number(decimal) * 100);
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
};
const maxUploadBytes = 8 * 1024 * 1024;
const maxImageDimension = 1600;

async function optimizeProductImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxImageDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const optimized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!optimized || optimized.size >= file.size) return file;
    return new File([optimized], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function AdminDashboard({ userName }: { userName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [mutatingProductId, setMutatingProductId] = useState<string | null>(null);
  const [storageConfigured, setStorageConfigured] = useState<boolean | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const stats = useMemo(() => ({ total: products.length, active: products.filter((item) => item.active).length, stock: products.reduce((sum, item) => sum + item.stock, 0) }), [products]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/products?all=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProducts(data.products);
      setStorageConfigured(data.storageConfigured === true);
      return data.products as Product[];
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível carregar o catálogo." }); }
    finally { setLoading(false); }
    return null;
  }

  useEffect(() => {
    fetch("/api/products?all=1", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProducts(data.products);
        setStorageConfigured(data.storageConfigured !== false);
      })
      .catch((error) => setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível carregar o catálogo." }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving && !optimizing) setPanelOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [saving, optimizing]);

  function openNew() { setForm(blank); setFile(null); setPreview(""); setNotice(null); setPanelOpen(true); }
  function openEdit(product: Product) {
    setForm({ ...product, price: (product.priceCents / 100).toFixed(2).replace(".", ","), compareAtPrice: product.compareAtPriceCents ? (product.compareAtPriceCents / 100).toFixed(2).replace(".", ",") : "" });
    setFile(null); setPreview(product.imageUrl); setNotice(null); setPanelOpen(true);
  }

  function catalogIsWritable() {
    if (storageConfigured === true) return true;
    setNotice({
      type: "error",
      text: storageConfigured === false
        ? "O armazenamento da loja ainda não está conectado. Crie um Vercel Blob público, conecte-o ao projeto e faça um novo deploy."
        : "Aguarde o catálogo terminar de carregar antes de editar.",
    });
    return false;
  }

  async function handleFile(nextFile?: File) {
    if (!nextFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      setNotice({ type: "error", text: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (nextFile.size > maxUploadBytes) {
      setNotice({ type: "error", text: "A imagem deve ter no máximo 8 MB." });
      return;
    }
    setOptimizing(true); setNotice(null);
    try {
      const preparedFile = await optimizeProductImage(nextFile);
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setFile(preparedFile); setPreview(URL.createObjectURL(preparedFile));
    } finally {
      setOptimizing(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!catalogIsWritable()) return;
    if (optimizing) { setNotice({ type: "error", text: "Aguarde a otimização da foto terminar." }); return; }
    const priceCents = toCents(form.price);
    const compareAtPriceCents = form.compareAtPrice ? toCents(form.compareAtPrice) : null;
    if (priceCents === null || (form.compareAtPrice && compareAtPriceCents === null)) {
      setNotice({ type: "error", text: "Informe os preços no formato 349,90." });
      return;
    }
    setSaving(true); setNotice(null);
    let uploadedImage: { imageUrl: string; imageKey: string } | null = null;
    let catalogSaved = false;
    try {
      let imageUrl = form.imageUrl; let imageKey = form.imageKey;
      if (file) {
        const blob = await upload(`products/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/uploads",
          clientPayload: JSON.stringify({ size: file.size, type: file.type }),
        });
        imageUrl = blob.url; imageKey = blob.pathname;
        uploadedImage = { imageUrl: blob.url, imageKey: blob.pathname };
      }
      if (!imageUrl) throw new Error("Selecione uma foto do relógio.");
      const payload = { ...form, priceCents, compareAtPriceCents, stock: Number(form.stock), imageUrl, imageKey };
      const response = await fetch(form.id ? `/api/products/${form.id}` : "/api/products", { method: form.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      catalogSaved = true;
      const confirmed = await load();
      if (!confirmed?.some((item) => item.id === data.product.id && item.priceCents === priceCents && item.active === form.active)) {
        throw new Error("A alteração foi enviada, mas não pôde ser confirmada. Recarregue o painel antes de tentar novamente.");
      }
      setPanelOpen(false); setNotice({ type: "success", text: form.id ? "Produto atualizado e confirmado na loja." : "Produto adicionado e confirmado no catálogo." });
    } catch (error) {
      if (uploadedImage && !catalogSaved) {
        await fetch("/api/uploads", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(uploadedImage),
        }).catch(() => undefined);
      }
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível salvar o produto." });
    }
    finally { setSaving(false); }
  }

  async function toggle(product: Product) {
    if (!catalogIsWritable()) return;
    if (mutatingProductId) return;
    setMutatingProductId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !product.active }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const confirmed = await load();
      const savedProduct = confirmed?.find((item) => item.id === product.id);
      if (!savedProduct || savedProduct.active !== !product.active) throw new Error("A visibilidade não pôde ser confirmada. Recarregue o painel.");
      setNotice({ type: "success", text: `${product.name} agora está ${savedProduct.active ? "visível" : "oculto"} na loja.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível alterar a visibilidade." });
    } finally { setMutatingProductId(null); }
  }

  async function remove(product: Product) {
    if (!catalogIsWritable()) return;
    if (mutatingProductId) return;
    if (!window.confirm(`Excluir ${product.name}? Esta ação não pode ser desfeita.`)) return;
    setMutatingProductId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const confirmed = await load();
      if (!confirmed || confirmed.some((item) => item.id === product.id)) throw new Error("A exclusão não pôde ser confirmada. Recarregue o painel.");
      setNotice({ type: "success", text: "Produto excluído e remoção confirmada." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível excluir o produto." });
    } finally { setMutatingProductId(null); }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.assign("/admin/login");
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar"><Link className="brand" href="/"><span>A</span>AURUM</Link><nav><a className="active" href="#catalogo">Catálogo</a><Link href="/" target="_blank">Ver loja ↗</Link></nav><div><span>Administrador</span><strong>{userName}</strong><button type="button" onClick={signOut}>Sair</button></div></aside>
      <section className="admin-main" id="catalogo">
        <header className="admin-header"><div><span>Painel administrativo</span><h1>Catálogo</h1><p>Cadastre e mantenha os relógios exibidos na sua loja.</p></div><button className="button primary" onClick={openNew}>Novo produto <b>+</b></button></header>
        {storageConfigured === false && <div className="admin-storage-warning" role="alert"><div><strong>Conecte o armazenamento para liberar as edições</strong><p>Os produtos demonstrativos estão em modo de leitura. Na Vercel, crie um Blob público, conecte ao projeto e faça um novo deploy.</p></div><a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Abrir Vercel ↗</a></div>}
        {notice && <div className={`admin-notice ${notice.type}`} role="status">{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
        <div className="admin-stats"><article><span>Produtos cadastrados</span><strong>{String(stats.total).padStart(2, "0")}</strong></article><article><span>Visíveis na loja</span><strong>{String(stats.active).padStart(2, "0")}</strong></article><article><span>Unidades em estoque</span><strong>{String(stats.stock).padStart(2, "0")}</strong></article></div>
        <div className="admin-table-wrap"><div className="admin-table-heading"><h2>Seus relógios</h2><span>{products.length} produtos</span></div>
          {loading ? <div className="admin-loading">Carregando catálogo...</div> : products.length ? <div className="admin-products">{products.map((product) => <article className="admin-product" key={product.id}><img src={product.imageUrl} alt="" loading="lazy" decoding="async" /><div className="admin-product-name"><span>{product.category}</span><strong>{product.name}</strong><small>{product.stock} em estoque</small></div><div className="admin-product-price"><span>Preço</span><strong>{money(product.priceCents)}</strong></div><label className="status-toggle"><input type="checkbox" checked={product.active} disabled={Boolean(mutatingProductId)} onChange={() => toggle(product)} /><span />{product.active ? "Visível" : "Oculto"}</label><div className="row-actions"><button disabled={Boolean(mutatingProductId)} onClick={() => openEdit(product)}>Editar</button><button className="danger" disabled={Boolean(mutatingProductId)} onClick={() => remove(product)}>Excluir</button></div></article>)}</div> : <div className="admin-empty"><h3>Seu catálogo está vazio.</h3><p>Adicione o primeiro relógio para ele aparecer na loja.</p><button className="button primary" onClick={openNew}>Adicionar produto</button></div>}
        </div>
      </section>

      <div className={panelOpen ? "admin-overlay open" : "admin-overlay"} onClick={() => !saving && !optimizing && setPanelOpen(false)} />
      <aside className={panelOpen ? "editor-panel open" : "editor-panel"} aria-hidden={!panelOpen} inert={!panelOpen}><form onSubmit={submit}>
        <div className="editor-heading"><div><span>{form.id ? "Editar produto" : "Novo produto"}</span><h2>{form.id ? form.name : "Adicionar relógio"}</h2></div><button type="button" onClick={() => setPanelOpen(false)} disabled={saving || optimizing}>×</button></div>
        <div className="editor-body">
          <label className="photo-upload"><span>Foto do relógio *</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={optimizing || saving} onChange={(event) => handleFile(event.target.files?.[0])} />{preview ? <img src={preview} alt="Prévia do produto" /> : <div><strong>+</strong><p>{optimizing ? "Otimizando foto..." : "Clique para enviar uma foto"}</p><small>JPG, PNG ou WebP · até 8 MB · otimização automática</small></div>}</label>
          <div className="form-grid"><label className="full"><span>Nome do produto *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Atlas Black" /></label><label><span>Preço *</span><input required inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="349,90" /></label><label><span>Preço anterior</span><input inputMode="decimal" value={form.compareAtPrice} onChange={(event) => setForm({ ...form, compareAtPrice: event.target.value })} placeholder="399,90" /></label><label><span>Estoque *</span><input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} /></label><label><span>Categoria *</span><input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Urbano" /></label><label className="full"><span>Chamada curta</span><input value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} placeholder="Best-seller" /></label><label className="full"><span>Descrição *</span><textarea required rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div>
          <fieldset><legend>Especificações</legend><div className="form-grid"><label><span>Cor da caixa</span><input value={form.caseColor} onChange={(event) => setForm({ ...form, caseColor: event.target.value })} /></label><label><span>Pulseira</span><input value={form.strap} onChange={(event) => setForm({ ...form, strap: event.target.value })} /></label><label><span>Movimento</span><input value={form.movement} onChange={(event) => setForm({ ...form, movement: event.target.value })} /></label><label><span>Resistência</span><input value={form.waterResistance} onChange={(event) => setForm({ ...form, waterResistance: event.target.value })} /></label></div></fieldset>
          <div className="check-row"><label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /><span />Destacar na página inicial</label><label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span />Produto visível na loja</label></div>
        </div>
        <div className="editor-footer"><button type="button" className="cancel" onClick={() => setPanelOpen(false)} disabled={saving || optimizing}>Cancelar</button><button className="button primary" disabled={saving || optimizing}>{optimizing ? "Otimizando foto..." : saving ? "Salvando..." : "Salvar produto"}</button></div>
      </form></aside>
    </main>
  );
}
