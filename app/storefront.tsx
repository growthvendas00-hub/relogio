"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { readStoredCart, reconcileCart, updateCartQuantity } from "@/lib/cart";
import { defaultStoreSettings, money, renderOrderMessage, type Order, type ShippingAddress, type StoreSettings } from "@/lib/commerce";
import { BrandLogo } from "./brand-logo";

type Product = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  category: string;
  caseColor: string;
  strap: string;
  movement: string;
  waterResistance: string;
  imageUrl: string;
  featured: boolean;
  active: boolean;
};

const fallbackProducts: Product[] = [
  { id: "atlas-black", slug: "atlas-black", name: "Atlas Black", eyebrow: "Best-seller", description: "Minimalismo em preto fosco com marcadores dourados. Presença marcante para o trabalho e para a noite.", priceCents: 34990, compareAtPriceCents: 39990, stock: 8, category: "Urbano", caseColor: "Preto fosco", strap: "Aço escovado", movement: "Quartzo japonês", waterResistance: "3 ATM", imageUrl: "/products/atlas-black.png", featured: true, active: true },
  { id: "monarque-gold", slug: "monarque-gold", name: "Monarque Gold", eyebrow: "Edição dourada", description: "Acabamento dourado escovado e mostrador preto profundo para ocasiões que pedem um nível a mais.", priceCents: 42990, compareAtPriceCents: 47990, stock: 5, category: "Premium", caseColor: "Dourado", strap: "Aço escovado", movement: "Quartzo japonês", waterResistance: "3 ATM", imageUrl: "/products/monarque-gold.png", featured: true, active: true },
  { id: "horizon-steel", slug: "horizon-steel", name: "Horizon Steel", eyebrow: "Clássico contemporâneo", description: "Caixa em aço, mostrador azul-marinho e pulseira em couro. Versátil do escritório ao fim de semana.", priceCents: 38990, compareAtPriceCents: null, stock: 11, category: "Casual", caseColor: "Prata", strap: "Couro azul-marinho", movement: "Quartzo japonês", waterResistance: "3 ATM", imageUrl: "/products/horizon-steel.png", featured: false, active: true },
  { id: "skmei-1146", slug: "skmei-anadigi-1146-prata-preto", name: "Relógio Masculino SKMEI AnaDigi 1146 — Prata e Preto", eyebrow: "Esportivo ana-digital", description: "Modelo robusto com caixa e pulseira em aço prateado, mostrador preto, leitura analógica e digital e detalhes vermelhos.", priceCents: 24990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto", strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições", imageUrl: "/products/skmei-1146.webp", featured: false, active: true },
  { id: "tuguir-tg1156", slug: "tuguir-anadigi-tg1156-prata-vermelho", name: "Relógio Masculino Tuguir AnaDigi TG1156 — Prata e Vermelho", eyebrow: "Performance urbana", description: "Relógio ana-digital de presença marcante, com pulseira prateada, mostrador preto e aro interno vermelho.", priceCents: 26990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata, preto e vermelho", strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições", imageUrl: "/products/tuguir-tg1156.webp", featured: false, active: true },
  { id: "skmei-2120-dourado", slug: "skmei-anadigi-2120-dourado", name: "Relógio Unissex SKMEI AnaDigi 2120 — Dourado", eyebrow: "Dourado contemporâneo", description: "Visual minimalista com acabamento integral dourado, mostrador preto e display digital discreto às seis horas.", priceCents: 21990, compareAtPriceCents: null, stock: 1, category: "Casual", caseColor: "Dourado e preto", strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições", imageUrl: "/products/skmei-2120-dourado.webp", featured: false, active: true },
  { id: "skmei-2120-prata", slug: "skmei-anadigi-2120-prata", name: "Relógio Unissex SKMEI AnaDigi 2120 — Prata", eyebrow: "Minimalismo urbano", description: "Acabamento prateado, mostrador preto limpo e display digital discreto para uma leitura versátil no dia a dia.", priceCents: 19990, compareAtPriceCents: null, stock: 1, category: "Casual", caseColor: "Prata e preto", strap: "Aço", movement: "Analógico e digital", waterResistance: "Consulte condições", imageUrl: "/products/skmei-2120-prata.webp", featured: false, active: true },
  { id: "skmei-0992", slug: "skmei-analogico-0992-prata-preto", name: "Relógio Masculino SKMEI Analógico 0992 — Prata e Preto", eyebrow: "Robusto essencial", description: "Modelo analógico com caixa robusta, bezel preto aparafusado, pulseira bicolor em aço e calendário lateral.", priceCents: 17990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto", strap: "Aço bicolor", movement: "Quartzo analógico", waterResistance: "Consulte condições", imageUrl: "/products/skmei-0992.webp", featured: false, active: true },
  { id: "skmei-1649", slug: "skmei-anadigi-1649-prata-preto", name: "Relógio Masculino SKMEI AnaDigi 1649 — Prata e Preto", eyebrow: "Impacto esportivo", description: "Caixa angular de grande presença, bezel preto numerado, pulseira em aço e múltiplas leituras digitais integradas.", priceCents: 25990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto", strap: "Aço", movement: "Analógico e digital", waterResistance: "3 ATM", imageUrl: "/products/skmei-1649.webp", featured: false, active: true },
  { id: "skmei-1335-dourado", slug: "skmei-digital-1335-dourado", name: "Relógio Masculino SKMEI Digital 1335 — Dourado", eyebrow: "Digital retrô", description: "Caixa digital retangular com acabamento dourado escovado, pulseira em aço e tela multifunções de leitura ampla.", priceCents: 22990, compareAtPriceCents: null, stock: 1, category: "Digital", caseColor: "Dourado e preto", strap: "Aço", movement: "Digital", waterResistance: "5 ATM", imageUrl: "/products/skmei-1335-dourado.webp", featured: false, active: true },
  { id: "skmei-2049", slug: "skmei-anadigi-2049-prata", name: "Relógio Masculino SKMEI AnaDigi 2049 — Prata", eyebrow: "Tecnologia em aço", description: "Mostrador preto com duas janelas digitais, leitura analógica sobreposta e pulseira prateada de três colunas.", priceCents: 23990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto", strap: "Aço", movement: "Analógico e digital", waterResistance: "3 ATM", imageUrl: "/products/skmei-2049.webp", featured: false, active: true },
  { id: "weide-wh5205", slug: "weide-anadigi-wh5205-prata-preto", name: "Relógio Masculino Weide AnaDigi WH-5205 — Prata e Preto", eyebrow: "Rugged premium", description: "Caixa robusta em prata e preto, mostrador ana-digital multifunções, detalhes vermelhos e pulseira esportiva em borracha.", priceCents: 28990, compareAtPriceCents: null, stock: 1, category: "Esportivo", caseColor: "Prata e preto", strap: "Borracha preta", movement: "Analógico e digital", waterResistance: "Consulte condições", imageUrl: "/products/weide-wh5205.webp", featured: false, active: true },
];

const emptyShippingAddress: ShippingAddress = {
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export function Storefront() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [completedOrder, setCompletedOrder] = useState<{ code: string; mode: StoreSettings["orderMode"] } | null>(null);
  const [customer, setCustomer] = useState({ name: "", instagram: "", whatsapp: "", consent: false, website: "" });
  const [address, setAddress] = useState<ShippingAddress>(emptyShippingAddress);
  const heroRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const storedCart = readStoredCart(window.localStorage.getItem("aurum-cart"));
    queueMicrotask(() => {
      setCart(storedCart);
      setCartHydrated(true);
    });
    fetch("/api/products")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const nextProducts = Array.isArray(data.products) ? data.products : [];
        setProducts(nextProducts);
        setCart((current) => reconcileCart(current, nextProducts));
      })
      .catch(() => setCart((current) => reconcileCart(current, fallbackProducts)))
      .finally(() => setLoading(false));
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setSettings((current) => ({ ...current, ...data.settings })))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (cartHydrated) window.localStorage.setItem("aurum-cart", JSON.stringify(cart));
  }, [cart, cartHydrated]);
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartOpen || checkoutOpen || Boolean(selected) || menuOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [cartOpen, checkoutOpen, selected, menuOpen]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCartOpen(false);
      setSelected(null);
      setMenuOpen(false);
      if (!checkoutSaving) setCheckoutOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [checkoutSaving]);

  useEffect(() => {
    const hero = heroRef.current;
    const video = heroVideoRef.current;
    const stage = hero?.querySelector<HTMLElement>(".hero-stage");
    if (!hero || !video || !stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    const syncHero = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const heroBounds = hero.getBoundingClientRect();
        const stageBounds = stage.getBoundingClientRect();
        const stickyTop = Number.parseFloat(window.getComputedStyle(stage).top) || 0;
        const travel = Math.max(1, heroBounds.height - stageBounds.height);
        const progress = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, (stickyTop - heroBounds.top) / travel));
        hero.style.setProperty("--hero-progress", progress.toFixed(4));

        if (!reducedMotion.matches && video.readyState >= 1 && Number.isFinite(video.duration)) {
          const targetTime = progress * Math.max(0, video.duration - 0.08);
          if (Math.abs(video.currentTime - targetTime) > 0.045) video.currentTime = targetTime;
        }
      });
    };

    const prepareVideo = () => {
      if (video.currentTime === 0) video.currentTime = 0.001;
      syncHero();
    };

    video.pause();
    video.addEventListener("loadedmetadata", prepareVideo);
    reducedMotion.addEventListener("change", syncHero);
    window.addEventListener("scroll", syncHero, { passive: true });
    window.addEventListener("resize", syncHero);
    syncHero();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      video.removeEventListener("loadedmetadata", prepareVideo);
      reducedMotion.removeEventListener("change", syncHero);
      window.removeEventListener("scroll", syncHero);
      window.removeEventListener("resize", syncHero);
    };
  }, []);

  const categories = ["Todos", ...Array.from(new Set(products.map((product) => product.category)))];
  const filtered = products.filter((product) => {
    const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return (category === "Todos" || product.category === category) && haystack.includes(query.toLowerCase());
  });
  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => ({ product: products.find((item) => item.id === id), quantity }))
    .filter((item): item is { product: Product; quantity: number } => Boolean(item.product));
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const freeShippingRemaining = Math.max(0, 40000 - subtotal);

  const heroProduct = useMemo(() => products.find((product) => product.featured) ?? products[0], [products]);

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    setCart((current) => updateCartQuantity(current, product, 1));
    setToast(`${product.name} adicionado ao carrinho`);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2200);
  }

  function changeQuantity(product: Product, delta: number) {
    setCart((current) => updateCartQuantity(current, product, delta));
  }

  function checkout() {
    setCartOpen(false);
    setCheckoutError("");
    setCompletedOrder(null);
    setCheckoutOpen(true);
  }

  async function submitCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (checkoutSaving) return;
    setCheckoutSaving(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          instagram: customer.instagram,
          whatsapp: customer.whatsapp,
          consent: customer.consent,
          website: customer.website,
          address,
          items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const order = data.order as Order;
      setCompletedOrder({ code: order.code, mode: data.orderMode });
      setCart({});
      if (data.orderMode === "customer_whatsapp") {
        const message = renderOrderMessage(data.customerWhatsappTemplate, order);
        window.open(`https://wa.me/${data.storeWhatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Não foi possível registrar o pedido.");
    } finally {
      setCheckoutSaving(false);
    }
  }

  return (
    <main>
      <div className="announcement">Frete grátis acima de R$ 400 <span /> Enviamos para todo o Brasil</div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Almare — página inicial"><BrandLogo priority /></a>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navegação principal">
          <a href="#colecao" onClick={() => setMenuOpen(false)}>Relógios</a>
          <a href="#manifesto" onClick={() => setMenuOpen(false)}>A Almare</a>
          <a href="#beneficios" onClick={() => setMenuOpen(false)}>Garantias</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button menu-button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho com ${count} itens`}>Carrinho <b>{String(count).padStart(2, "0")}</b></button>
        </div>
      </header>

      <section className="hero hero-scroll" id="top" ref={heroRef} aria-label="Apresentação Almare">
        <div className="hero-stage">
          <video ref={heroVideoRef} className="hero-video" src="/hero/aurum-watch.mp4" muted playsInline preload="auto" aria-hidden="true" />
          <div className="hero-video-shade" />
          <div className="hero-copy hero-scroll-copy">
            <span className="section-kicker">Nova coleção · 2026</span>
            <h1>Seu tempo.<br /><em>Sua presença.</em></h1>
            <p>Relógios masculinos para quem transforma cada detalhe em identidade. Design urbano, acabamento marcante e versatilidade real.</p>
            <div className="hero-actions">
              <a href="#colecao" className="button primary">Explorar coleção <span>↗</span></a>
              <button className="text-link" onClick={() => heroProduct && setSelected(heroProduct)}>Ver destaque</button>
            </div>
            <div className="hero-stats"><div><strong>30</strong><span>dias de garantia</span></div><div><strong>24h</strong><span>para envio</span></div><div><strong>BR</strong><span>entrega nacional</span></div></div>
          </div>
          {heroProduct && <aside className="hero-watch-meta" aria-label={`Destaque ${heroProduct.name}`}>
            <span>Em destaque</span>
            <div><h2>{heroProduct.name}</h2><p>{heroProduct.caseColor} · {heroProduct.strap}</p></div>
            <strong>{money(heroProduct.priceCents)}</strong>
            <button onClick={() => setSelected(heroProduct)}>Conhecer modelo <span>↗</span></button>
          </aside>}
          <div className="hero-scroll-cue" aria-hidden="true"><span>Role para explorar</span><i /></div>
          <div className="hero-progress" aria-hidden="true"><span>01</span><i /><small>02</small></div>
        </div>
      </section>

      <section className="ticker" aria-label="Diferenciais"><div>AÇO INOXIDÁVEL <i /> DESIGN MASCULINO <i /> ENVIO IMEDIATO <i /> GARANTIA ALMARE <i /> AÇO INOXIDÁVEL <i /> DESIGN MASCULINO</div></section>

      <section className="collection" id="colecao">
        <div className="section-heading"><div><span className="section-kicker">Coleção essencial</span><h2>Feitos para acompanhar<br />o seu ritmo.</h2></div><p>Do preto absoluto ao dourado marcante. Escolha a peça que traduz sua presença.</p></div>
        <div className="catalog-tools">
          <div className="category-list" role="group" aria-label="Filtrar por categoria">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <label className="search-field"><span className="sr-only">Buscar relógio</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar modelo" /><b>⌕</b></label>
        </div>
        {loading ? <div className="product-grid" aria-label="Carregando produtos">{[1,2,3].map((item) => <div className="product-skeleton" key={item} />)}</div> : filtered.length ? (
          <div className="product-grid">{filtered.map((product, index) => (
            <article className="product-card" key={product.id}>
              <button className="product-image" onClick={() => setSelected(product)} aria-label={`Ver detalhes do ${product.name}`}><span className="product-number">{String(index + 1).padStart(2, "0")}</span>{product.featured && <span className="product-badge">Destaque</span>}<img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" /></button>
              <div className="product-info"><div><span>{product.eyebrow}</span><h3>{product.name}</h3></div><div className="product-price">{product.compareAtPriceCents && <del>{money(product.compareAtPriceCents)}</del>}<strong>{money(product.priceCents)}</strong><small>ou 6x de {money(Math.round(product.priceCents / 6))}</small></div></div>
              <button className="add-button" disabled={product.stock === 0} onClick={() => addToCart(product)}>{product.stock === 0 ? "Indisponível" : "Adicionar ao carrinho"}<span>+</span></button>
            </article>
          ))}</div>
        ) : <div className="empty-state"><h3>Nenhum relógio encontrado.</h3><p>Tente buscar outro nome ou remover o filtro.</p><button className="text-link" onClick={() => { setQuery(""); setCategory("Todos"); }}>Limpar filtros</button></div>}
      </section>

      <section className="manifesto" id="manifesto"><div className="manifesto-mark">A</div><div><span className="section-kicker">Manifesto Almare</span><h2>Não é sobre contar as horas.<br /><em>É sobre fazer cada uma valer.</em></h2><p>Acreditamos que estilo não precisa pedir licença. Cada peça Almare nasce para acompanhar homens que sabem onde querem chegar — com confiança, precisão e personalidade.</p></div></section>

      <section className="benefits" id="beneficios">
        <article><span>01</span><h3>Envio imediato</h3><p>Seu pedido é preparado e despachado em até 24 horas úteis.</p></article>
        <article><span>02</span><h3>Garantia de 30 dias</h3><p>Compre com tranquilidade. Nossa garantia acompanha cada peça.</p></article>
        <article><span>03</span><h3>Frete grátis</h3><p>Entrega gratuita para todo o Brasil em compras acima de R$ 400.</p></article>
        <article><span>04</span><h3>Atendimento direto</h3><p>Fale com a Almare antes, durante e depois da compra.</p></article>
      </section>

      <section className="whatsapp-cta"><span>Conheça a nova Almare</span><h2>Estilo que acompanha<br />o seu momento.</h2><a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="button light">Acompanhar no Instagram <span>↗</span></a></section>

      <footer><a className="brand" href="#top" aria-label="Voltar ao início"><BrandLogo /></a><p>Relógios masculinos com presença.</p><div><a href="#colecao">Coleção</a><a href="#beneficios">Garantias</a><a href={settings.instagramUrl} target="_blank" rel="noreferrer">Instagram</a><a href={`https://wa.me/${settings.storeWhatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a><a href="/admin">Admin</a></div><small>© 2026 Almare. Todos os direitos reservados.</small></footer>

      <div className={cartOpen ? "overlay is-open" : "overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer is-open" : "cart-drawer"} aria-hidden={!cartOpen} inert={!cartOpen}>
        <div className="drawer-header"><div><span>Seu carrinho</span><h2>{count} {count === 1 ? "item" : "itens"}</h2></div><button className="close-button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho">×</button></div>
        {cartItems.length ? <><div className="cart-items">{cartItems.map(({ product, quantity }) => <article className="cart-item" key={product.id}><img src={product.imageUrl} alt="" loading="lazy" decoding="async" /><div><span>{product.category}</span><h3>{product.name}</h3><strong>{money(product.priceCents)}</strong><div className="quantity"><button onClick={() => changeQuantity(product, -1)} aria-label={`Diminuir ${product.name}`}>−</button><b>{quantity}</b><button disabled={quantity >= product.stock} onClick={() => changeQuantity(product, 1)} aria-label={`Aumentar ${product.name}`}>+</button></div></div></article>)}</div><div className="cart-summary">{freeShippingRemaining > 0 ? <p>Faltam <strong>{money(freeShippingRemaining)}</strong> para o frete grátis.</p> : <p className="success">✓ Você ganhou frete grátis.</p>}<div className="progress"><span style={{ width: `${Math.min(100, subtotal / 400)}%` }} /></div><dl><dt>Subtotal</dt><dd>{money(subtotal)}</dd><dt>Entrega</dt><dd>{subtotal >= 40000 ? "Grátis" : "A calcular"}</dd></dl><button className="button primary full" onClick={checkout}>Continuar pedido <span>→</span></button><small>Você não paga agora. A Almare confirmará os dados diretamente com você.</small></div></> : <div className="cart-empty"><span>00</span><h3>Seu carrinho está vazio.</h3><p>Descubra a coleção e escolha o relógio que combina com o seu momento.</p><button className="button primary" onClick={() => { setCartOpen(false); document.getElementById("colecao")?.scrollIntoView({ behavior: "smooth" }); }}>Explorar coleção</button></div>}
      </aside>

      {checkoutOpen && <div className="modal-wrap checkout-modal-wrap" role="dialog" aria-modal="true" aria-label="Finalizar pedido">
        <button className="modal-backdrop" onClick={() => !checkoutSaving && setCheckoutOpen(false)} aria-label="Fechar finalização" />
        <div className="checkout-modal">
          <button className="close-button" disabled={checkoutSaving} onClick={() => setCheckoutOpen(false)} aria-label="Fechar finalização">×</button>
          {completedOrder ? <div className="checkout-success"><span>Pedido {completedOrder.code}</span><h2>Pedido recebido.</h2><p>{completedOrder.mode === "customer_whatsapp" ? "Abrimos o WhatsApp com a mensagem pronta. Envie a mensagem para continuarmos o atendimento." : "A Almare recebeu seus dados e entrará em contato pelo WhatsApp para confirmar o pedido."}</p><button className="button primary full" onClick={() => setCheckoutOpen(false)}>Voltar para a loja</button></div> : <form onSubmit={submitCheckout}>
            <span className="section-kicker">Seus dados</span><h2>Dados para entrega.</h2><p>Informe seus contatos e o endereço completo. Nenhum pagamento será feito agora.</p>
            <div className="checkout-contact-grid"><label><span>Nome *</span><input required maxLength={100} autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Seu nome" /></label><label><span>WhatsApp com DDD *</span><input required inputMode="tel" autoComplete="tel" value={customer.whatsapp} onChange={(event) => setCustomer({ ...customer, whatsapp: event.target.value })} placeholder="(28) 99999-9999" /></label><label className="wide"><span>@ do Instagram</span><input maxLength={80} value={customer.instagram} onChange={(event) => setCustomer({ ...customer, instagram: event.target.value })} placeholder="@seuusuario" /></label></div>
            <fieldset className="checkout-address"><legend>Endereço de entrega</legend><p>Usaremos estes dados somente para organizar a entrega do seu pedido.</p><div className="checkout-address-grid"><label><span>CEP *</span><input required inputMode="numeric" autoComplete="postal-code" maxLength={9} value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} placeholder="00000-000" /></label><label><span>Estado *</span><input required autoCapitalize="characters" autoComplete="address-level1" maxLength={2} value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} placeholder="ES" /></label><label className="wide"><span>Cidade *</span><input required autoComplete="address-level2" maxLength={80} value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} placeholder="Sua cidade" /></label><label className="wide"><span>Rua ou avenida *</span><input required autoComplete="address-line1" maxLength={120} value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} placeholder="Nome da rua ou avenida" /></label><label><span>Número *</span><input required maxLength={20} value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} placeholder="123" /></label><label><span>Bairro *</span><input required autoComplete="address-level3" maxLength={80} value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} placeholder="Seu bairro" /></label><label className="wide"><span>Complemento</span><input autoComplete="address-line2" maxLength={80} value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} placeholder="Apartamento, bloco ou referência (opcional)" /></label></div></fieldset>
            <label className="honeypot" aria-hidden="true"><span>Site</span><input tabIndex={-1} autoComplete="off" value={customer.website} onChange={(event) => setCustomer({ ...customer, website: event.target.value })} /></label><label className="consent-check"><input required type="checkbox" checked={customer.consent} onChange={(event) => setCustomer({ ...customer, consent: event.target.checked })} /><span />Autorizo a Almare a usar estes dados para atender e entregar este pedido.</label>{checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}<div className="checkout-review"><span>{count} {count === 1 ? "item" : "itens"}</span><strong>{money(subtotal)}</strong></div><button className="button primary full" disabled={checkoutSaving}>{checkoutSaving ? "Registrando pedido..." : settings.orderMode === "customer_whatsapp" ? "Registrar e abrir WhatsApp" : "Enviar pedido para a Almare"}<span>→</span></button>
          </form>}
        </div>
      </div>}

      {selected && <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={`Detalhes do ${selected.name}`}><button className="modal-backdrop" onClick={() => setSelected(null)} aria-label="Fechar detalhes" /><div className="product-modal"><button className="close-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button><div className="modal-image"><img src={selected.imageUrl} alt={selected.name} /></div><div className="modal-content"><span className="section-kicker">{selected.eyebrow}</span><h2>{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{money(selected.priceCents)}</strong><small>ou 6x de {money(Math.round(selected.priceCents / 6))}</small><dl><div><dt>Caixa</dt><dd>{selected.caseColor}</dd></div><div><dt>Pulseira</dt><dd>{selected.strap}</dd></div><div><dt>Movimento</dt><dd>{selected.movement}</dd></div><div><dt>Resistência</dt><dd>{selected.waterResistance}</dd></div></dl><button className="button primary full" disabled={selected.stock === 0} onClick={() => { addToCart(selected); setSelected(null); setCartOpen(true); }}>{selected.stock ? "Adicionar ao carrinho" : "Indisponível"}<span>+</span></button><p className="stock-note">{selected.stock > 0 ? `Envio imediato · ${selected.stock} unidades disponíveis` : "Produto temporariamente indisponível"}</p></div></div></div>}
      <div className={toast ? "toast is-visible" : "toast"} role="status">{toast}<span>✓</span></div>
    </main>
  );
}
