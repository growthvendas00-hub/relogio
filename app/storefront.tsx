"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

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
];

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function Storefront() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem("aurum-cart");
      if (!saved) return;
      try { setCart(JSON.parse(saved)); } catch { /* carrinho inválido é ignorado */ }
    });
    fetch("/api/products")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => data.products?.length && setProducts(data.products))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { window.localStorage.setItem("aurum-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartOpen || Boolean(selected) || menuOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [cartOpen, selected, menuOpen]);

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

  const heroProduct = useMemo(() => products.find((product) => product.slug === "horizon-steel") ?? products.find((product) => product.featured) ?? products[0], [products]);

  function addToCart(product: Product) {
    setCart((current) => ({ ...current, [product.id]: Math.min(product.stock, (current[product.id] ?? 0) + 1) }));
    setToast(`${product.name} adicionado ao carrinho`);
    window.setTimeout(() => setToast(""), 2200);
  }

  function changeQuantity(product: Product, delta: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(product.stock, (current[product.id] ?? 0) + delta));
      const updated = { ...current };
      if (next === 0) delete updated[product.id]; else updated[product.id] = next;
      return updated;
    });
  }

  function checkout() {
    const lines = cartItems.map(({ product, quantity }) => `• ${quantity}x ${product.name} — ${money(product.priceCents * quantity)}`);
    const shipping = subtotal >= 40000 ? "Frete grátis" : "Frete a calcular";
    const message = ["Olá! Quero finalizar meu pedido na AURUM:", "", ...lines, "", `Subtotal: ${money(subtotal)}`, `Entrega: ${shipping}`, "", "Pode me orientar sobre pagamento e entrega?"].join("\n");
    window.open(`https://wa.me/5528999187401?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main>
      <div className="announcement">Frete grátis acima de R$ 400 <span /> Enviamos para todo o Brasil</div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AURUM — página inicial"><span>A</span>AURUM</a>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navegação principal">
          <a href="#colecao" onClick={() => setMenuOpen(false)}>Relógios</a>
          <a href="#manifesto" onClick={() => setMenuOpen(false)}>A AURUM</a>
          <a href="#beneficios" onClick={() => setMenuOpen(false)}>Garantias</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button menu-button" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho com ${count} itens`}>Carrinho <b>{String(count).padStart(2, "0")}</b></button>
        </div>
      </header>

      <section className="hero hero-scroll" id="top" ref={heroRef} aria-label="Apresentação AURUM">
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

      <section className="ticker" aria-label="Diferenciais"><div>AÇO INOXIDÁVEL <i /> DESIGN MASCULINO <i /> ENVIO IMEDIATO <i /> GARANTIA AURUM <i /> AÇO INOXIDÁVEL <i /> DESIGN MASCULINO</div></section>

      <section className="collection" id="colecao">
        <div className="section-heading"><div><span className="section-kicker">Coleção essencial</span><h2>Feitos para acompanhar<br />o seu ritmo.</h2></div><p>Do preto absoluto ao dourado marcante. Escolha a peça que traduz sua presença.</p></div>
        <div className="catalog-tools">
          <div className="category-list" role="group" aria-label="Filtrar por categoria">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <label className="search-field"><span className="sr-only">Buscar relógio</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar modelo" /><b>⌕</b></label>
        </div>
        {loading ? <div className="product-grid" aria-label="Carregando produtos">{[1,2,3].map((item) => <div className="product-skeleton" key={item} />)}</div> : filtered.length ? (
          <div className="product-grid">{filtered.map((product, index) => (
            <article className="product-card" key={product.id}>
              <button className="product-image" onClick={() => setSelected(product)} aria-label={`Ver detalhes do ${product.name}`}><span className="product-number">0{index + 1}</span>{product.featured && <span className="product-badge">Destaque</span>}<img src={product.imageUrl} alt={product.name} /></button>
              <div className="product-info"><div><span>{product.eyebrow}</span><h3>{product.name}</h3></div><div className="product-price">{product.compareAtPriceCents && <del>{money(product.compareAtPriceCents)}</del>}<strong>{money(product.priceCents)}</strong><small>ou 6x de {money(Math.round(product.priceCents / 6))}</small></div></div>
              <button className="add-button" disabled={product.stock === 0} onClick={() => addToCart(product)}>{product.stock === 0 ? "Indisponível" : "Adicionar ao carrinho"}<span>+</span></button>
            </article>
          ))}</div>
        ) : <div className="empty-state"><h3>Nenhum relógio encontrado.</h3><p>Tente buscar outro nome ou remover o filtro.</p><button className="text-link" onClick={() => { setQuery(""); setCategory("Todos"); }}>Limpar filtros</button></div>}
      </section>

      <section className="manifesto" id="manifesto"><div className="manifesto-mark">A</div><div><span className="section-kicker">Manifesto AURUM</span><h2>Não é sobre contar as horas.<br /><em>É sobre fazer cada uma valer.</em></h2><p>Acreditamos que estilo não precisa pedir licença. Cada AURUM nasce para acompanhar homens que sabem onde querem chegar — com confiança, precisão e personalidade.</p></div></section>

      <section className="benefits" id="beneficios">
        <article><span>01</span><h3>Envio imediato</h3><p>Seu pedido é preparado e despachado em até 24 horas úteis.</p></article>
        <article><span>02</span><h3>Garantia de 30 dias</h3><p>Compre com tranquilidade. Nossa garantia acompanha cada peça.</p></article>
        <article><span>03</span><h3>Frete grátis</h3><p>Entrega gratuita para todo o Brasil em compras acima de R$ 400.</p></article>
        <article><span>04</span><h3>Atendimento direto</h3><p>Fale com a AURUM no WhatsApp antes, durante e depois da compra.</p></article>
      </section>

      <section className="whatsapp-cta"><span>Escolha seu próximo relógio</span><h2>Pronto para marcar<br />seu momento?</h2><a href="https://wa.me/5528999187401?text=Olá!%20Quero%20conhecer%20os%20relógios%20AURUM." target="_blank" rel="noreferrer" className="button light">Falar com um consultor <span>↗</span></a></section>

      <footer><a className="brand" href="#top"><span>A</span>AURUM</a><p>Relógios masculinos com presença.</p><div><a href="#colecao">Coleção</a><a href="#beneficios">Garantias</a><a href="https://wa.me/5528999187401" target="_blank" rel="noreferrer">WhatsApp</a><a href="/admin">Admin</a></div><small>© 2026 AURUM. Todos os direitos reservados.</small></footer>

      <div className={cartOpen ? "overlay is-open" : "overlay"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer is-open" : "cart-drawer"} aria-hidden={!cartOpen}>
        <div className="drawer-header"><div><span>Seu carrinho</span><h2>{count} {count === 1 ? "item" : "itens"}</h2></div><button className="close-button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho">×</button></div>
        {cartItems.length ? <><div className="cart-items">{cartItems.map(({ product, quantity }) => <article className="cart-item" key={product.id}><img src={product.imageUrl} alt="" /><div><span>{product.category}</span><h3>{product.name}</h3><strong>{money(product.priceCents)}</strong><div className="quantity"><button onClick={() => changeQuantity(product, -1)} aria-label={`Diminuir ${product.name}`}>−</button><b>{quantity}</b><button onClick={() => changeQuantity(product, 1)} aria-label={`Aumentar ${product.name}`}>+</button></div></div></article>)}</div><div className="cart-summary">{freeShippingRemaining > 0 ? <p>Faltam <strong>{money(freeShippingRemaining)}</strong> para o frete grátis.</p> : <p className="success">✓ Você ganhou frete grátis.</p>}<div className="progress"><span style={{ width: `${Math.min(100, subtotal / 400)}%` }} /></div><dl><dt>Subtotal</dt><dd>{money(subtotal)}</dd><dt>Entrega</dt><dd>{subtotal >= 40000 ? "Grátis" : "A calcular"}</dd></dl><button className="button primary full" onClick={checkout}>Finalizar no WhatsApp <span>↗</span></button><small>Pagamento e endereço serão combinados no atendimento.</small></div></> : <div className="cart-empty"><span>00</span><h3>Seu carrinho está vazio.</h3><p>Descubra a coleção e escolha o relógio que combina com o seu momento.</p><button className="button primary" onClick={() => setCartOpen(false)}>Explorar coleção</button></div>}
      </aside>

      {selected && <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={`Detalhes do ${selected.name}`}><button className="modal-backdrop" onClick={() => setSelected(null)} aria-label="Fechar detalhes" /><div className="product-modal"><button className="close-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button><div className="modal-image"><img src={selected.imageUrl} alt={selected.name} /></div><div className="modal-content"><span className="section-kicker">{selected.eyebrow}</span><h2>{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{money(selected.priceCents)}</strong><small>ou 6x de {money(Math.round(selected.priceCents / 6))}</small><dl><div><dt>Caixa</dt><dd>{selected.caseColor}</dd></div><div><dt>Pulseira</dt><dd>{selected.strap}</dd></div><div><dt>Movimento</dt><dd>{selected.movement}</dd></div><div><dt>Resistência</dt><dd>{selected.waterResistance}</dd></div></dl><button className="button primary full" disabled={selected.stock === 0} onClick={() => { addToCart(selected); setSelected(null); setCartOpen(true); }}>{selected.stock ? "Adicionar ao carrinho" : "Indisponível"}<span>+</span></button><p className="stock-note">{selected.stock > 0 ? `Envio imediato · ${selected.stock} unidades disponíveis` : "Produto temporariamente indisponível"}</p></div></div></div>}
      <div className={toast ? "toast is-visible" : "toast"} role="status">{toast}<span>✓</span></div>
    </main>
  );
}
