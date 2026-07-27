# Segurança da Almare

## Dados protegidos

Pedidos contêm nome, telefone e Instagram do cliente. Esses dados são criptografados pela aplicação antes de serem persistidos e só podem ser consultados por uma sessão administrativa válida.

Nunca publique ou compartilhe os valores de `ADMIN_PASSWORD`, `AUTH_SECRET`, `CUSTOMER_DATA_SECRET` ou tokens do Vercel Blob. Use valores diferentes entre Preview e Production.

## Configuração obrigatória na Vercel

- Use um `AUTH_SECRET` aleatório com pelo menos 32 caracteres.
- Use um `CUSTOMER_DATA_SECRET` aleatório, diferente do `AUTH_SECRET`, com pelo menos 32 caracteres. Não altere esse valor depois de receber pedidos sem antes migrar os dados.
- Mantenha `ADMIN_PASSWORD` exclusiva para a Almare e troque-a se houver suspeita de acesso indevido.
- Ative Bot Protection para os endpoints de login e criação de pedido.
- Proteja deployments de Preview com autenticação da Vercel.
- Restrinja o acesso ao projeto Vercel e ao repositório GitHub somente às pessoas necessárias e habilite MFA nas contas.

## Limites atuais do MVP

- Os limitadores internos de tentativas protegem uma instância, mas não substituem uma regra global no Firewall da Vercel.
- O catálogo e os pedidos usam armazenamento de objetos. Para tráfego pago, pagamentos ou grande volume, migre pedidos, clientes, estoque e métricas para PostgreSQL com operações transacionais e autorização no servidor.
- Use um Blob privado ou banco privado para dados pessoais. Um Blob público torna o objeto acessível a quem conhecer sua URL, ainda que o conteúdo atual esteja criptografado pela aplicação.
- O pedido atual é uma intenção de compra, não uma reserva atômica de estoque. Confirme a disponibilidade antes de cobrar o cliente.

## Resposta a incidente

Se houver suspeita de vazamento ou invasão:

1. Suspenda temporariamente o painel e a criação de pedidos no Firewall da Vercel.
2. Troque `ADMIN_PASSWORD` e `AUTH_SECRET`, faça redeploy e encerre sessões existentes.
3. Preserve logs e identifique período, contas, IPs e dados afetados.
4. Não altere `CUSTOMER_DATA_SECRET` antes de exportar ou migrar os pedidos, pois ele é necessário para descriptografá-los.
5. Revise acessos no GitHub e na Vercel e comunique os titulares quando aplicável.

## Reporte

Falhas de segurança podem ser reportadas de forma privada para `malagoligrowth@gmail.com`. Não publique detalhes sensíveis em issues públicas.
