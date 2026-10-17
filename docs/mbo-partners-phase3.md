# MBO Partners — Fase 3

Implementação local em 12/10/2026. Atribuição, registros de comissão e progressão estão conectados ao checkout existente. A obtenção automática do líquido real ainda depende de homologação da fonte financeira; não há saldo sacável nem repasse nesta fase.

## Fluxo implementado

1. O link do painel aponta para `/mbo-premium?ref=CODIGO`, no domínio já definido em `src/lib/site.ts`.
2. O runtime consulta a preferência `marketing` do consentimento existente, incluindo sua validade. Sem consentimento não registra cliques nem persiste a referência. O código pode permanecer apenas na memória da página enquanto o visitante decide.
3. A API de captura verifica origem e consentimento declarado, resolve exclusivamente um afiliado aprovado e aplica limite persistente. Um código inválido/inativo não substitui uma indicação válida anterior.
4. Um token aleatório de 32 bytes é gravado em cookie HttpOnly, SameSite=Lax, Secure e prefixo `__Host-` em HTTPS, sem Domain; em HTTP local usa nome sem prefixo. O banco guarda somente seu SHA-256. A janela começa em 30 dias e é configurável. O último clique válido substitui o cookie.
5. A revogação do consentimento limpa o cookie e solicita invalidação do token no banco. O checkout também verifica a preferência atual e não envia a indicação se ela não estiver autorizada. Uma falha de revogação no banco retorna 503 e ainda limpa o cookie local.
6. O botão aguarda uma captura em andamento antes de preparar o pedido. Falha de rastreamento não impede uma compra comum; pode resultar em compra sem a nova atribuição. Nunca se inventa uma atribuição posterior para compensar essa falha.
7. `prepare_affiliate_mercado_pago_order` encapsula a função anterior de preparação. Revalida token, validade, ativação e usuário. Autocompras diretas e ambiente de teste são excluídos. A existência de um pedido congela sua atribuição, inclusive quando ela é nula. Repetir o UUID não troca o afiliado.
8. A consulta oficial e as validações existentes de Mercado Pago continuam em `syncMercadoPagoOrder`. O novo wrapper de gravação executa a função anterior, registra evidência permitida e aciona a transição financeira na mesma transação.

## Comissão e níveis

- Uma linha por pedido atribuído, protegida por unicidade, começa em `awaiting_payment`.
- Na primeira aprovação autoritativa válida, o banco bloqueia o perfil, congela o percentual do nível atual e muda para `pending_calculation`. Base líquida e comissão continuam nulas; nulo não é exibido como zero.
- A contagem válida e a promoção são atômicas com a confirmação. A venda que atinge a meta usa o percentual anterior: venda 10 recebe 25%; venda 11 recebe 30%; venda 30 recebe 30%; venda 31 recebe 35%; venda 60 recebe 35%; venda 61 recebe 40%.
- Promoções têm histórico com comissão causadora, nível anterior/novo, percentual e total válido. Repetições de webhook/polling não promovem nem contam duas vezes.
- Suspensão antes da confirmação cancela a elegibilidade da comissão. Suspensão posterior não apaga valores históricos; liberações e saques deverão revalidar status na fase 4.
- Reembolso/cancelamento retira a contribuição da contagem uma única vez, mas não rebaixa o nível conquistado. A comissão vira `canceled`; valores já apurados permanecem como histórico e são excluídos dos totais elegíveis.
- O mapeamento atual do provedor considera reembolso parcial como reembolso. Esta versão cancela conservadoramente toda a comissão nesse caso. Ajustar proporcionalmente depende da conciliação dos valores reais e não foi presumido.
- Mediação continua seguindo o comportamento existente de revogação de Premium. Reversão favorável de contestação e recuperação após pagamento exigem tratamento posterior; nenhuma reversão financeira automática foi inventada.

### Conciliar o líquido

`affiliate_reconcile_net` é uma fronteira SQL exclusiva de serviço, sem API pública nem formulário administrativo. Recebe centavos, referência única de evidência e hash SHA-256. Verifica pedido real pago, ausência de revogação, valor entre zero e o bruto elegível, conflito de evidência e estado da comissão. Repetição idêntica é idempotente; alteração exige fluxo de ajuste futuro.

O cálculo usa `bigint`: `(liquido_centavos * percentual_pontos_base + 5000) / 10000`, arredondamento de meio centavo para cima uma única vez. A conciliação move para `in_security`, nunca para disponível. O prazo inicial é 30 dias desde a primeira confirmação processada pelo servidor. Sua passagem, isoladamente, não libera nada.

**Não existe ainda adaptador de liquidação chamando essa função.** Os testes que fornecem líquido conhecido são fixtures; não comprovam receita real. A função pressupõe evidência já validada pelo adaptador de serviço. O hash identifica uma evidência, não a autentica sozinho.

A [referência oficial de Orders](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/get-order/get), consultada durante esta etapa, não estabeleceu no retorno examinado um campo de líquido recebido aplicável à integração. Falta homologar uma transação e sua fonte oficial de liquidação, correlacionar os IDs e separar tarifas, juros e estornos. Não inferir que um ID `PAY...` seja um identificador da Payments API, nem usar `marketplace_fee` como tarifa genérica.

### Transação e falhas

Nesta etapa o cálculo/registro de estado é inteiramente local ao PostgreSQL, sem chamada externa dentro da transação. Por isso foi usada transação síncrona, em lugar da fila inicialmente proposta. Pedido, estado da comissão, promoção e evidência são atômicos. Falha SQL reverte a gravação e retorna erro ao fluxo existente, permitindo retry de webhook/polling. A ausência de líquido não é uma falha SQL e não impede Premium.

Uma futura conciliação externa precisa de execução periódica, retentativas e observabilidade. Não há processo em segundo plano fictício ou liberação por relógio do navegador.

## Painéis

- Meu link: copiar/compartilhar somente após ativação do rastreamento.
- Visão geral: vendas válidas, pagamentos pendentes, comissões em segurança, cliques consentidos e gráfico de vendas válidas nos últimos 30 dias.
- Vendas: paginação, identificador interno da comissão/venda, data, líquido, percentual, comissão e estado. Nenhum nome, email ou identificador do comprador é retornado.
- Evolução: contagem válida, progresso e vendas restantes; conserva nível conquistado.
- Administração: ativar/desativar novas indicações e alterar a janela de 1 a 90 dias. Mudanças são auditadas; prazo novo só vale para cliques futuros. Desativar novas indicações não altera pedidos já atribuídos.
- Edição visual de níveis/percentuais, extrato contábil, exportações e saques continuam para a próxima etapa administrativa/financeira. As regras de nível são dados no banco, e o percentual histórico da comissão já está congelado.

## Configuração e implantação

Migração: `supabase/migrations/20261011000200_affiliate_attribution.sql`, após a migração de cadastro `20261011000100_affiliate_membership.sql` e a migração de pedidos Mercado Pago.

Novas variáveis exclusivamente de servidor:

- `AFFILIATE_REFERRAL_SECRET`: segredo aleatório com pelo menos 32 caracteres para HMAC do identificador de limite. Não reutilizar credenciais de pagamento, não prefixar com `NEXT_PUBLIC_`, não registrar seu conteúdo.
- `AFFILIATE_TRUSTED_IP_HEADER`: opcional; nome de cabeçalho de IP que o proxy de entrada comprovadamente sobrescreve. Não configurar um cabeçalho controlável pelo cliente. Sem configuração, todas as capturas compartilham um limite conservador de 30 por hora. Não presumir a infraestrutura de entrada.

O IP bruto não é armazenado. O HMAC usa também o dia para limitar correlação; buckets expiram e são removidos após dois dias durante novas capturas. Cliques são contagens de eventos consentidos, não usuários únicos nem prova antifraude. O bloqueio de autocompra compara contas; conluio e contas alternativas continuam exigindo revisão.

O rastreamento começa desativado no banco. Configurar segredo/ingress, aplicar migrações em homologação, testar o fluxo real e então ativar pelo administrador. A API de configuração recusa ativar sem segredo configurado. A migração deve preceder o novo código de checkout: não há fallback silencioso que perderia atribuições se a RPC estivesse ausente.

Não houve aplicação remota nem alteração de variáveis hospedadas nesta entrega. As assinaturas TypeScript das novas RPCs autenticadas foram acrescentadas localmente; regenerar os tipos completos após homologar o schema remoto.

## Testes

```powershell
node scripts/affiliate-referral.test.mjs
node scripts/affiliate-attribution-sql.test.mjs
node scripts/affiliate-membership-sql.test.mjs
node scripts/affiliate-membership-api.test.mjs
node scripts/mercado-pago.test.mjs
node scripts/mercado-pago-sql.test.mjs
node scripts/affiliate-membership-ui.test.mjs
```

Os testes de banco usam PGlite, como os testes existentes. Cobrem expiração/revogação, atribuição imutável, autocompra, modo de teste, repetição, precisão monetária, apuração ausente, conflito de evidência, cancelamentos, suspensão, promoções até Ouro, RLS/permissões e regressão de Premium. Os testes de HTTP/cliente usam mocks e verificam consentimento, origem, cookie opaco, deduplicação e remoção de PII da evidência.

O teste visual monta fixtures dos componentes, incluindo link ativo, venda em apuração, gráfico, progresso e configuração. Não é teste de sessão real. O teste visual existente de Mercado Pago também pode ser executado com `MBO_TEST_URL=http://localhost:3000`; o provedor é interceptado, não há compra real.

Resultados locais: os seis testes de SQL/HTTP/consentimento/regressão listados acima passaram, assim como TypeScript e ESLint dos arquivos alterados. O teste visual do painel passou em 320/390/1440 pixels, com link ativo, venda em apuração e gráfico. A regressão visual do checkout passou no mobile e no desktop com movimento reduzido; o cenário desktop com animação normal atingiu timeout aguardando o botão e permanece fora da validação desta entrega. Nenhuma mudança foi feita na animação para contornar esse resultado. A rota temporária de fixtures foi removida.

## Bloqueios de lançamento ainda existentes

- Schema remoto/migrações, variáveis e fronteira de proxy ainda não verificados nesta etapa.
- Adaptador oficial de líquido e correlação de transação não homologados; comissões reais continuarão em apuração.
- Compra atribuída real + webhook assinado + conferência de banco ainda pendentes.
- Concorrência em conexões PostgreSQL distintas ainda não exercitada por PGlite.
- Carteira, liberação, saques, ajustes parciais e recuperação pós-pagamento pertencem à fase 4; não há saldo sacável nesta implementação.
