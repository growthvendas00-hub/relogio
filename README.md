# AURUM — e-commerce de relógios

MVP responsivo de uma loja de relógios masculinos com estética de luxo urbano, carrinho e fechamento do pedido pelo WhatsApp. Inclui painel administrativo para editar produtos, preços, estoque, descrições e fotos sem alterar o código.

## Publicar na Vercel

1. Importe este repositório em [vercel.com/new](https://vercel.com/new).
2. Mantenha o framework detectado como **Next.js** e publique o primeiro deploy.
3. No projeto da Vercel, abra **Storage**, crie um banco **Blob** público e conecte-o ao projeto. A Vercel adicionará `BLOB_READ_WRITE_TOKEN` automaticamente.
4. Em **Settings → Environment Variables**, adicione:
   - `ADMIN_EMAIL`: `malagoligrowth@gmail.com`
   - `ADMIN_PASSWORD`: uma senha forte com pelo menos 10 caracteres
   - `AUTH_SECRET`: um segredo aleatório com pelo menos 32 caracteres
5. Faça um novo deploy para aplicar as variáveis.
6. Acesse `/admin`, entre com a senha escolhida e cadastre seus produtos.

As variáveis devem ser habilitadas em Production. Se quiser testar o painel em deploys de prévia, habilite-as também em Preview. Nunca salve senhas reais no repositório.

## Como funciona

- A vitrine inicia com três produtos demonstrativos.
- O catálogo editado e as imagens ficam persistidos no Vercel Blob.
- Fotos aceitas: JPG, PNG ou WebP, com até 8 MB.
- A sessão administrativa expira após 12 horas e usa cookie seguro.
- O carrinho é salvo no navegador do cliente.
- O pedido é enviado para o WhatsApp `+55 28 99918-7401`.
- Frete grátis em compras acima de R$ 400, garantia de 30 dias e envio imediato.

## Desenvolvimento local

Requer Node.js 22.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Para editar o catálogo localmente, preencha `.env.local` com um token de uma loja Vercel Blob de desenvolvimento e credenciais administrativas. Sem o token, a vitrine continua exibindo os produtos demonstrativos, mas o painel não grava alterações.

## Validação

```bash
npm run lint
npm test
npm run build
```
