# Mercado Pago — Premium vitalício

Checkout Pro via Orders API (`POST /v1/orders`). Valor fixo de R$ 59,90 definido no servidor. O botão exige conta PqEstudar com e-mail confirmado antes de criar o pedido; o comprador pode pagar usando outra conta Mercado Pago sem mudar o dono do Premium. O login volta à oferta, onde o usuário clica novamente em comprar.

## Configuração

Execute `node scripts/mercado-pago-setup.mjs` na raiz. O script acrescenta somente variáveis ausentes em `.env.local`, ignorado pelo Git. Preencha os valores localmente, nunca em chats ou commits:

| Variável | Valor |
| --- | --- |
| `MERCADO_PAGO_MODE` | `test` inicialmente; `live` apenas com credenciais reais |
| `MERCADO_PAGO_ACCESS_TOKEN` | Access Token da seção de credenciais de teste |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Assinatura secreta gerada no painel Webhooks |
| `MERCADO_PAGO_SELLER_ID` | User ID do vendedor correspondente às credenciais (teste: `3689326936`) |
| `MERCADO_PAGO_SITE_URL` | Origem HTTPS que executará a integração; domínio canônico do projeto: `https://www.pqestudar.com.br` |

O servidor também utiliza `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. A Public Key não é necessária neste fluxo de redirecionamento server-side.

1. Aplicar `supabase/migrations/20260914000100_mercado_pago_premium.sql` ao banco do ambiente de destino. Preserva compras Stripe e assinaturas existentes.
2. Disponibilizar a versão com as novas rotas em um ambiente HTTPS de teste e configurar nele as variáveis. Reiniciar o servidor local após mudar `.env.local`.
3. No painel da aplicação Mercado Pago, abrir **Webhooks → Configurar notificações** no ambiente correspondente. URL: `https://www.pqestudar.com.br/api/mercado-pago/webhook` (substituir o domínio se estiver usando preview). Usar o domínio canônico evita redirecionamento do webhook. Selecionar **Order (Mercado Pago)** e o evento de **Chargebacks/Contestações** de Orders quando disponível. Copiar a assinatura secreta para a variável do servidor.
4. Usar a conta compradora de teste e os cartões do painel. Não usar cartões reais no modo de teste. Confirmar aprovação, recusa, pendência, cancelamento, reembolso e contestação, incluindo entrega e repetição dos webhooks.
5. Um pedido simulado aprovado mostra **Pagamento de teste confirmado**. Não gera Premium real: `live_mode=false` é excluído das duas funções de autorização do banco.
6. Após homologar, configurar token, seller ID e segredo do ambiente real, definir `MERCADO_PAGO_MODE=live`, conferir chave Pix e tarifas/parcelas na conta, e publicar. Verificar uma compra real autorizada ponta a ponta antes de afirmar validação em produção.

Não há configuração de parcelas sem juros subsidiadas pelo vendedor no payload. As opções e custos exibidos dependem das configurações da conta e da disponibilidade do Mercado Pago; revisar no painel antes de anunciar parcelamento.

## Rotas e segurança

- `POST /api/mercado-pago/create-checkout`: valida origem e identidade com `auth.getUser()`, confere vendedor brasileiro e modo via `/users/me`, persiste pedido antes de chamar o provedor, usa UUID como chave de idempotência e limite de dez novas tentativas por usuário/hora.
- `POST /api/mercado-pago/webhook`: valida HMAC de `data.id`, `x-request-id` e `ts`, busca o pedido autenticado na API e confere vendedor, ambiente, referência, produto, moeda e valor. Falhas de API ou banco respondem 503 para reentrega; não libera por dados do corpo ou query de retorno.
- `GET /api/mercado-pago/premium-status?reference=<uuid>`: consulta só pedidos da conta autenticada e reconcilia o estado via API, no máximo uma vez por 15 segundos por consulta sequencial. Não é um rate limiter distribuído.
- `/mbo-premium/sucesso?provider=mercadopago&reference=<uuid>`: retorna login, pendente, falha, teste aprovado ou acesso real. URLs antigas com `session_id` continuam atendendo compras Stripe.
- Banco: tabela com RLS de leitura do próprio usuário; gravação e funções de registro exclusivas do serviço. Reembolso (inclusive parcial), cancelamento ou contestação revogam esse pedido. Eventos antigos não restauram acesso revogado. Outras assinaturas/compras válidas permanecem válidas. Disputa ganha requer revisão explícita antes de restaurar esse pedido.

## Validação local

`node scripts/mercado-pago.test.mjs`

`node scripts/mercado-pago-sql.test.mjs` (requer instalação isolada: `npm install --prefix test-results/mercado-pago-sql --no-save --package-lock=false --ignore-scripts @electric-sql/pglite`). Executa PostgreSQL local em memória, incluindo a migração Stripe anterior e regressões de acesso/RLS.

`node scripts/mercado-pago-ui.test.mjs` com o servidor em `http://localhost:3000`, ou `MBO_TEST_URL` definido. Usa respostas simuladas de checkout/status; não comprova uma compra real.

## Referências oficiais

- [Criar Orders para Checkout Pro](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-pro/create-order/post)
- [URLs de retorno](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/web-integration/configure-back-urls)
- [Notificações de Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications)
- [Estados da order](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/payment-management/status/order-status)
