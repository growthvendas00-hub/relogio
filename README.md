# Almare — e-commerce de relógios

MVP responsivo de uma loja de relógios masculinos com estética de luxo urbano, carrinho, cadastro de pedidos e atendimento pelo WhatsApp. Inclui gestão de pedidos, clientes, faturamento, vendas manuais, mensagens e catálogo sem alterar o código.

## Publicar na Vercel

1. Importe este repositório em [vercel.com/new](https://vercel.com/new).
2. Mantenha o framework detectado como **Next.js** e publique o primeiro deploy.
3. No projeto da Vercel, abra **Storage**, crie um banco **Blob** público e conecte-o ao projeto. Conexões novas usam OIDC e criam `BLOB_STORE_ID`/`BLOB_WEBHOOK_PUBLIC_KEY`; conexões antigas podem usar `BLOB_READ_WRITE_TOKEN`.
4. Em **Settings → Environment Variables**, adicione:
   - `ADMIN_EMAIL`: `malagoligrowth@gmail.com`
   - `ADMIN_PASSWORD`: uma senha forte com pelo menos 10 caracteres
   - `AUTH_SECRET`: um segredo aleatório com pelo menos 32 caracteres
   - `CUSTOMER_DATA_SECRET`: outro segredo aleatório com pelo menos 32 caracteres (recomendado para criptografar os dados dos clientes)
5. Faça um novo deploy para aplicar as variáveis.
6. Acesse `/admin`, entre com a senha escolhida e cadastre seus produtos.

As variáveis devem ser habilitadas em Production. Se quiser testar o painel em deploys de prévia, habilite-as também em Preview. Nunca salve senhas reais no repositório.

## Como funciona

- A vitrine inicia com três produtos demonstrativos.
- O catálogo editado e as imagens ficam persistidos no Vercel Blob.
- Fotos aceitas: JPG, PNG ou WebP, com até 8 MB.
- A sessão administrativa expira após 12 horas e usa cookie seguro.
- O carrinho é salvo no navegador do cliente.
- Todo pedido feito no site é registrado no painel antes do atendimento.
- Em **Configurações**, escolha se o cliente abre o WhatsApp ou se a Almare entra em contato depois.
- Pedidos externos podem ser registrados manualmente para compor o faturamento.
- O faturamento considera somente pedidos marcados como **Pago**.
- Nome, Instagram e WhatsApp dos clientes são criptografados antes de serem gravados no Blob.
- Frete grátis em compras acima de R$ 400, garantia de 30 dias e envio imediato.

## Desenvolvimento local

Requer Node.js 22.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Para editar o catálogo localmente, preencha `.env.local` com um token de uma loja Vercel Blob de desenvolvimento e credenciais administrativas. Em produção na Vercel, a conexão OIDC fornece credenciais temporárias automaticamente. Sem nenhuma conexão Blob, a vitrine continua exibindo os produtos demonstrativos, mas o painel não grava alterações.

## Segurança e futura integração PIX

- O painel usa sessão assinada, cookie `HttpOnly`, proteção de origem e limite de tentativas de login.
- As rotas administrativas validam novamente preço, estoque, visibilidade, texto e referências de imagem no servidor.
- As respostas de API não são armazenadas em cache e o site envia CSP, proteção contra iframe, MIME sniffing e políticas restritivas do navegador.
- Antes de aceitar PIX, crie pedidos e valores em um banco no servidor. Nunca aceite total, status de pagamento ou identificador de produto calculado somente pelo navegador.
- Confirme pagamentos exclusivamente por webhook assinado do provedor, com idempotência, proteção contra repetição, conferência do valor e registro de auditoria.
- Não marque um pedido como pago pelo simples retorno do cliente à página de sucesso.
- Não troque `CUSTOMER_DATA_SECRET` depois que já houver pedidos sem antes migrar os dados; a chave é necessária para lê-los.

## Validação

```bash
npm run lint
npm test
npm run build
```
