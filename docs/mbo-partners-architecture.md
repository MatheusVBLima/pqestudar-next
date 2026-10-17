# MBO Partners — diagnóstico e plano de implementação

Data: 11/10/2026. Registro da Fase 1. Este documento descreve o código local inspecionado; não atesta o estado do banco hospedado nem a homologação de pagamentos reais. A implementação local posterior de cadastro e aprovação está documentada em [Fase 2](mbo-partners-phase2.md).

## 1. Infraestrutura existente

| Área | Evidência no repositório | Decisão |
| --- | --- | --- |
| Aplicação | Next.js 16.2.4, React 19, TypeScript, App Router | Usar as rotas e os layouts existentes |
| Login | `src/lib/supabase-server.ts`, Supabase Auth e cookies SSR | Mesmo usuário de `auth.users`; operações sensíveis usam `auth.getUser()` |
| Administração | `src/lib/admin-guard.ts`, `src/app/(admin)/admin/layout.tsx`, RPC `has_role` | Validar permissão em cada operação, além do layout; moderador não recebe acesso financeiro |
| Proteção de navegação | `src/proxy.ts` verifica presença de cookie | Não equivale a autorização; adicionar `/afiliados` e verificar identidade no servidor |
| Componentes | Radix, componentes `ui`, React Query, Recharts e estilos administrativos existentes | Reutilizar padrões de cards, tabelas, seleção, carregamento e erros |
| Consentimento | `src/hooks/useCookieConsent.tsx`, `cookieConsent` no localStorage, categoria `marketing` | Integrar captura à preferência existente; não criar rastreamento persistente antes do consentimento |
| Checkout | `src/app/api/mercado-pago/create-checkout/route.ts` | Manter criação dinâmica pela Orders API e idempotência atual |
| Confirmação | `src/lib/mercado-pago-fulfillment.ts` | Ponto comum ao webhook e ao polling; toda extensão deve ser idempotente |
| Premium | `get_effective_subscription`, `has_active_subscription` | Preservar regras atuais de Mercado Pago, Stripe e assinaturas |

### Tabelas e funções existentes relevantes

- `auth.users`: identidade; não criar outra autenticação.
- `mercado_pago_orders`: UUID interno, usuário, email, vendedor, ambiente, ID da order, valor bruto, moeda, status e datas. Há RLS de leitura do proprietário e escrita de serviço. Não armazena líquido recebido, tarifas, comissão ou atribuição.
- `prepare_mercado_pago_order`: cria/reutiliza intenção, verifica proprietário e configuração; bloqueio transacional por usuário e limite de dez pedidos por hora.
- `record_mercado_pago_order`: bloqueia o pedido, impede regressão de aprovação para pendente, trata revogação e atualizações antigas. É o ponto para uma caixa de eventos transacional.
- `product_purchases` e `subscriptions`: fontes existentes de acesso Premium; não converter em carteira de afiliados.
- `affiliate_pages`: páginas de divulgação com slug, nome, URLs de checkout e ativação. Usada em `src/app/(site)/mapa-dos-beneficios/[slug]/page.tsx`. Não representa vínculo entre afiliado e usuário nem contabilidade.
- `admin_influencers`: cadastro comercial com contatos e status; RLS administrativo. Não migrar automaticamente essas pessoas para afiliados aprovados.
- `has_role`: reutilizável para autorização. Evitar confiar em flags enviadas pelo navegador.

Migrações de referência: `20260708000100_stripe_product_purchases.sql`, `20260907000100_admin_influencers.sql`, `20260913000100_stripe_premium_lifetime.sql`, `20260914000100_mercado_pago_premium.sql`.

## 2. Fluxo de pagamento atual e lacunas

O checkout verifica origem, UUID de requisição, usuário autenticado com email confirmado e conta vendedora. Prepara o pedido no banco antes de chamar `POST /v1/orders`, usando seu UUID como chave de idempotência. Valor e produto são definidos no servidor: Premium vitalício, R$ 59,90.

O webhook valida HMAC e consulta `GET /v1/orders/{id}`. A validação compara referência interna, vendedor, ambiente, produto, valor e moeda. O retorno do checkout não concede Premium por parâmetros da URL. A consulta autenticada de status também sincroniza a order; ela não comprova que o webhook foi entregue.

Lacunas para comissões:

1. O tipo e a persistência atuais não guardam dados financeiros suficientes para comprovar receita líquida.
2. `partially_refunded` é normalizado para `refunded`; `in_mediation` é normalizado para `canceled`. A comissão precisa preservar valores e eventos detalhados independentemente dessas regras existentes de acesso.
3. Não há tarefa de reconciliação/liberação de comissões implementada nesse fluxo.
4. O registro atual de revogação é terminal. Recuperações de uma contestação precisam de histórico financeiro próprio, sem modificar silenciosamente a regra de Premium.
5. Não existe repasse Pix de saída integrado nesse checkout.

### Fonte do líquido: requisito ainda por homologar

A [referência oficial de Orders](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/get-order/get) apresenta valores da order e transações, mas isso não comprova a receita líquida do vendedor na integração atual. `marketplace_fee` não deve ser usado como substituto genérico das tarifas do processamento. O exemplo tem IDs de pagamento `PAY...`; não presumir que sejam IDs da Payments API nem transformá-los por remoção de prefixo.

Solução de integração: obter uma transação homologada e seu documento financeiro oficial; confirmar a correlação entre order, pagamento e relatório de liquidação, campos de tarifas, juros, estornos e líquido. Implementar um adaptador com fixtures sanitizadas dessa origem e chave única da evidência. Enquanto não houver correspondência verificável, manter a venda em **pendente de apuração**, sem saldo disponível. Uma falha de apuração não deve bloquear o Premium de uma compra válida.

O Mercado Pago documenta uma [API de Payouts](https://www.mercadopago.com.br/developers/en/docs/payouts/resources/endpoints-map). Isso não comprova habilitação dessa conta nem disponibilidade do produto necessário para Pix de saída. A fase 5 permanece separada; a primeira versão registra pagamentos manuais conciliados.

## 3. Modelo proposto — novas entidades, ainda não criadas

| Entidade | Responsabilidade e restrições |
| --- | --- |
| `affiliate_profiles` | Um perfil por usuário; código único, status, nível conquistado; sem exclusão em cascata do histórico financeiro |
| `affiliate_applications` | Solicitação, decisão, responsável, motivo e versão dos termos; impedir duplicidade pendente |
| `affiliate_levels` | Níveis, metas e percentuais em pontos-base, ordenação e configuração versionada |
| `affiliate_level_history` | Promoção, configuração aplicada, evento originador e eventual decisão antifraude |
| `affiliate_referrals` | Último clique consentido, token opaco armazenado como hash, expiração e atribuição; sem PII no painel |
| `affiliate_order_attributions` | Uma atribuição imutável por pedido existente; vínculo criado antes da chamada de pagamento |
| `affiliate_commissions` | Uma comissão por pedido; percentual congelado, líquido comprovado, estado e prazo de segurança |
| `affiliate_payment_events` | Caixa de eventos durável para processamento/reconciliação, tentativas e chave de deduplicação |
| `affiliate_reconciliations` | Evidência oficial, pagamento, valores bruto/tarifas/juros/líquido e revisão; sem sobrescrever evidência anterior |
| `affiliate_ledger` | Lançamentos imutáveis por evento, conta e comissão; correções por contralançamento |
| `affiliate_payout_requests` | Pedido, valor, chave Pix protegida congelada no pedido, estado e chave idempotente |
| `affiliate_payout_allocations` | Parcela de cada comissão reservada; permite saque parcial e bloqueio por estorno |
| `affiliate_payout_attempts` | Tentativas, referências únicas de transferência, comprovantes privados e conciliação |
| `affiliate_settings` | Janela, segurança, mínimo, ativação e versão das regras |
| `affiliate_materials` | Materiais oficiais publicados e ordenados, usando armazenamento existente quando aplicável |
| `affiliate_audit_logs` | Ator, operação, motivo, entidade e metadados mínimos; imutável |

As tabelas adicionais de atribuição, alocação e conciliação atendem responsabilidades que não aparecem nas tabelas atuais. Confirmar novamente o schema hospedado antes de aplicar migrações para evitar colisões ou duplicação.

## 4. Invariantes de implementação

### Atribuição

- O navegador envia apenas o código de referência e a escolha de consentimento; o servidor resolve o afiliado ativo.
- Token aleatório em cookie HttpOnly, Secure em produção e SameSite=Lax; preservar somente com consentimento válido. Limpar atribuição quando revogado. Não guardar a referência persistente em localStorage para contornar recusa.
- Último clique válido por 30 dias inicialmente, configurável. Um clique inválido não substitui o anterior válido.
- A preparação do pedido valida validade, status do afiliado e ausência de autocompra dentro da transação que congela a atribuição.
- Repetir o checkout com o mesmo UUID não muda o afiliado. Um clique posterior afeta somente pedidos novos.
- Revalidar suspensão na confirmação. Comparar usuário comprador impede autocompra direta; outras identidades e conluio exigem sinais e revisão, não uma promessa de antifraude absoluto.
- Cliques medidos são cliques consentidos e filtrados, não visitantes únicos garantidos.

### Confirmação e níveis

- Registrar evento financeiro na mesma transação da atualização do pedido; processamento posterior reexecutável não pode perder o evento após conceder Premium.
- Deduplicar por pedido e identidade/versão do evento do provedor, com restrições SQL e bloqueios, não apenas consultas prévias em JavaScript.
- Política proposta: congelar percentual na primeira confirmação autoritativa válida; usar o nível anterior à venda. A décima venda recebe 25% e promove para Bronze; a próxima recebe 30%. Congelar também quando o líquido ainda estiver em apuração.
- Serializar confirmação de vendas do mesmo afiliado. Invalidar a contribuição da venda para metas uma única vez em reembolso/fraude; preservar nível conquistado salvo decisão antifraude auditada.
- Separar contagem válida atual de nível conquistado para explicar por que o nível não cai após um reembolso.
- Valores em centavos `bigint` no banco e percentuais em pontos-base. Usar aritmética inteira/decimal com arredondamento documentado uma vez por comissão. Não recalcular percentuais históricos ao editar níveis.
- Pedidos de teste nunca criam saldo real. Não atribuir retroativamente pedidos antigos.

### Carteira e saques

- Contas contábeis distintas: pendente, disponível, reservado, pago e recuperação. A soma dos lançamentos é a fonte de verdade; contadores podem ser projeções verificáveis.
- Liberação exige prazo vencido, receita reconciliada e verificação recente de elegibilidade no provedor. Falha de consulta mantém bloqueado.
- Pedido de saque trava a carteira e reserva alocações em uma única transação. Soma concorrente nunca pode ultrapassar o disponível.
- Saque mínimo sem valor arbitrário: administrador precisa configurá-lo antes de habilitar solicitações.
- Rejeição/falha definitiva devolve apenas reservas ainda válidas. Estorno invalida alocações e bloqueia pagamento do saque afetado.
- Reembolso após pagamento gera recuperação e sinalização; não dispara débito bancário.
- Pagamento manual exige referência única, data, valor e comprovante privado, conciliados pelo administrador. Apenas enviar um arquivo não comprova transferência.
- Antes de iniciar pagamento, congelar tentativa e validar novamente reservas. Uma transferência externa e uma transação PostgreSQL não são atômicas; se houver estorno durante o Pix, registrar o pagamento real e o débito de recuperação, sem apagar fatos.
- Chave Pix não aparece em listagens gerais, logs ou exports padrão. Guardar protegida no servidor, mascarar no painel e limitar acesso aos responsáveis pelo pagamento. Comprovantes em bucket privado com acesso temporário autorizado.
- Bloquear UPDATE/DELETE do ledger e da auditoria pelas contas da aplicação; administradores operam funções auditadas. Manutenção privilegiada do banco permanece um limite operacional a controlar.

## 5. Arquivos e rotas de implementação

Alterar:

- `src/components/layout/navbar-next.tsx`: entrada Afiliados em desktop e celular.
- `src/components/admin/dashboard/AdminSidebar.tsx`: Gestão de Afiliados.
- `src/proxy.ts`: navegação protegida da nova área, sem tratá-la como única segurança.
- `src/components/providers/cookie-consent-runtime.tsx` e integração com `useCookieConsent`: captura/revogação da referência.
- `src/app/api/mercado-pago/create-checkout/route.ts`: resolução da atribuição e preparação atômica antes da chamada externa.
- `src/lib/mercado-pago.ts`: modelos completos dos eventos financeiros confirmados, preservando validações atuais.
- `src/lib/mercado-pago-fulfillment.ts`: persistência transacional do evento e reconciliação idempotente.
- `src/integrations/supabase/types.ts`: regenerar após migrações, sem espalhar `any`.
- Testes `scripts/mercado-pago.test.mjs` e `scripts/mercado-pago-sql.test.mjs`: ampliar mantendo regressões existentes.

Criar, com nomes propostos:

- `src/app/(site)/afiliados/page.tsx` e componentes em `src/components/affiliates/`.
- `src/app/(admin)/admin/mbo-partners/page.tsx` e cliente administrativo no padrão existente. Correção da proposta: `/admin/afiliados` já gerencia `affiliate_pages` e deve ser preservada.
- `src/app/api/affiliates/*` e `src/app/api/admin/affiliates/*`: operações explícitas, validação Zod, origem, identidade, permissões e respostas privadas sem cache.
- `src/lib/affiliates/*`: autorização, atribuição, dinheiro, evidências e reconciliação, separados do código cliente.
- Migrações incrementais em `supabase/migrations/`, testes SQL em `supabase/tests/` e testes de integração em `scripts/`.

RPCs financeiras devem ter `search_path` fixo, permissões explícitas, sem EXECUTE público por padrão. Endpoints de escrita precisam de limites persistentes por usuário/operação; memória do processo não basta em múltiplas instâncias. Export CSV precisa neutralizar fórmulas e preservar isolamento. Evitar consultas sem paginação.

## 6. Entregas por etapa

1. **Diagnóstico (este documento):** arquitetura, lacunas, testes de referência e plano.
2. **Cadastro/painel:** migração de perfis, solicitações, níveis e auditoria; RLS; menu; apresentação/status; aprovação; painel com dados reais ou estados vazios, sem números fictícios.
3. **Indicações/comissões:** consentimento, vínculo imutável do pedido, caixa de eventos, integração de receita líquida, comissões e progressão; permanecer sem liberação financeira até homologar a fonte oficial.
4. **Carteira/saques:** ledger, conciliação periódica, segurança, reservas, pagamentos manuais, recuperação, materiais, configuração e exportação.
5. **Automação:** somente após confirmar provedor/conta/contrato e homologar Pix de saída. Não faz parte da habilitação da primeira versão.
6. **Testes:** executados em cada etapa, seguidos de homologação ponta a ponta antes do lançamento.

## 7. Plano de verificação e situação atual

Baseline executado em 11/10/2026:

- `node scripts/mercado-pago.test.mjs`: PASS. Testes locais com mocks de HMAC, validações do provedor, propriedade, repetição, estornos, ambiente e status privado.
- `node scripts/mercado-pago-sql.test.mjs`: PASS. Migrações e regras PostgreSQL em PGlite, incluindo regressão Stripe, revogação, idempotência e RLS.

Esses resultados não comprovam um webhook real nem a configuração do banco hospedado.

Matriz obrigatória para Partners:

- Usuário comum, afiliado A/B, pendente, rejeitado, suspenso, moderador e administrador; teste direto de APIs/RPCs, não apenas ocultação de menus.
- Solicitação duplicada, decisão concorrente, suspensão durante confirmação e durante reserva.
- Consentimento recusado/revogado, referência expirada, último clique, código inválido, autocompra, alteração do pedido e isolamento entre sessões.
- Webhook repetido e fora de ordem; polling simultâneo; falha entre gravação e processamento; reconciliação após falha de rede.
- Líquido indisponível, taxa real, juros, arredondamento, múltiplas transações e valores divergentes.
- Limites 9/10, 29/30 e 59/60 com vendas simultâneas; cancelamento e reembolso sem dupla subtração; percentual histórico preservado.
- Reembolso total/parcial, contestação e recuperação depois de pago; estorno durante saque.
- Dois saques simultâneos em conexões reais PostgreSQL, repetição da mesma requisição, referência Pix duplicada e comprovante inacessível a terceiros. PGlite isoladamente não prova concorrência multiusuário real.
- UI mobile/desktop, loading/error/empty, busca paginada, acessibilidade e ausência de dados pessoais de compradores.
- Compra/Premium existentes sem afiliado continuam funcionando.

### Pendências para lançamento

Confirmar schema remoto e permissões; homologar fonte financeira e mapeamento de IDs; configurar mínimo e regras do programa; implantar execução periódica observável; validar compra e webhook reais com persistência; validar transferência manual e conciliação. Nenhuma migração remota, compra, repasse ou implantação foi feita nesta fase.
