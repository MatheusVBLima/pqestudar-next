# MBO Partners — Fase 2

Implementação local de cadastro, revisão administrativa e painel inicial. Não ativa comissões, rastreamento ou saques.

## Rotas

- `/afiliados`: exige o login existente; apresentação e formulário para quem ainda não solicitou; estados pendente, rejeitado e suspenso; painel inicial para aprovado.
- `/admin/mbo-partners`: Gestão de Afiliados; filtros, paginação de 25 registros, aprovação, rejeição, suspensão, reativação e dez eventos recentes de auditoria por cadastro.
- `/admin/afiliados`: permanece com o gerenciador existente de `affiliate_pages`. A rota proposta inicialmente no diagnóstico foi corrigida ao conferir a navegação completa.
- `/api/affiliates` e `/api/admin/affiliates`: usam usuário verificado via `auth.getUser()`, cliente autenticado e funções SQL autorizadas. Não usam service role nem identidade enviada pelo cliente.

## Banco

Migração: `supabase/migrations/20261011000100_affiliate_membership.sql`.

Cria níveis, perfis, solicitações e auditoria. Níveis iniciais: Inicial 25%, Bronze 30%, Prata 35%, Ouro 40%. Edição administrativa de regras fica para a etapa financeira; os valores já são dados de banco, não constantes da interface.

Cadastro exige email confirmado e permite uma solicitação por conta nesta etapa. Repetir a operação retorna o estado existente, sem gerar cadastros novos nem reiniciar uma rejeição/suspensão. Aprovação gera um código exclusivo, preservado na reativação. O link rastreável ainda não é disponibilizado.

Todas as mutações acontecem por RPC, com bloqueios transacionais e autorização interna. Aprovação inicial apenas de pendente; suspensão apenas de aprovado; reativação apenas de suspenso. A versão do cadastro impede decisões concorrentes baseadas em dados antigos. Operações administrativas válidas são limitadas a 60 por minuto por ator no banco. Solicitações são limitadas a uma por identidade e idempotentes. GETs não possuem limitador distribuído nesta etapa.

RLS separa cadastros e solicitações por usuário; admin/developer têm leitura administrativa e autoridade de decisão, em continuidade com o cadastro administrativo existente. Moderadores não têm acesso administrativo. Tabelas não concedem escrita direta às contas de aplicação; logs não são atualizados nem apagados por elas. O proprietário privilegiado do banco continua sendo uma fronteira operacional.

Os motivos de rejeição são visíveis ao solicitante; a interface avisa o administrador antes da confirmação. Chaves Pix e documentos não são coletados nesta fase.

As assinaturas das cinco RPCs foram adicionadas manualmente ao arquivo TypeScript existente, a partir da migração. Regenerar os tipos completos após aplicação em ambiente de homologação. Não houve geração a partir de um banco remoto.

## Validação local

Executar da raiz do projeto:

```powershell
node scripts/affiliate-membership-sql.test.mjs
node scripts/affiliate-membership-api.test.mjs
node scripts/mercado-pago.test.mjs
node scripts/mercado-pago-sql.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

O teste SQL usa o PGlite já disponível no projeto em `test-results/mercado-pago-sql/node_modules`. Em um checkout novo, provisionar essa dependência de teste conforme o harness de pagamentos existente. Ele testa migração, RLS, permissões, transições, repetição, versão, auditoria e limite de operações. Não substitui concorrência em conexões PostgreSQL reais.

O teste de API usa mocks para identidade/RPC e verifica origem, payload, cache privado, erros, filtros e ausência de identidade controlada pelo solicitante. A autorização efetiva é exercitada pelo teste SQL.

Com o Next local rodando em `localhost:3000`, executar:

```powershell
node scripts/affiliate-membership-ui.test.mjs
```

Esse teste cria uma rota temporária `partners-preview-local`, monta os componentes com fixtures e intercepta apenas as APIs do programa; remove o arquivo da rota ao terminar. Não executar simultaneamente com build/deploy. Em interrupção forçada, conferir a remoção do arquivo temporário. Capturas ficam em `test-results/affiliates`. São evidências de componentes, não de login ou RLS hospedado. Cobre aplicação, estados, abas, erro/retry, decisão administrativa e overflow em 320/390/1440 pixels.

## Aplicação e homologação pendentes

Resultado local em 11/10/2026: testes SQL do programa, testes de API, regressões Mercado Pago/Stripe, TypeScript e ESLint dos arquivos alterados passaram. O teste visual com fixtures passou, incluindo temas claro/escuro e ausência de erros de hidratação/runtime. A rota temporária foi removida após a execução. Esses resultados não atestam login ou persistência no ambiente hospedado.

Nenhuma migração remota ou implantação foi executada. Antes de habilitar as rotas em produção:

1. Conferir schema/migrações do destino e aplicar a migração aditiva em homologação usando o fluxo Supabase do projeto.
2. Regenerar tipos e repetir checks.
3. Testar sessões reais separadas: usuário comum, afiliado A/B, administrador, developer e moderador; validar também guard administrativo existente e menu desktop/mobile.
4. Confirmar persistência da solicitação e de cada decisão, visibilidade correta do motivo e acesso direto às APIs/RPCs com sessão alheia.
5. Testar duas revisões concorrentes em conexões distintas: apenas a decisão baseada na versão vigente deve entrar.
6. Aplicar e publicar pelo fluxo normal do projeto. Sem a migração, as APIs retornam indisponibilidade; não simulam aprovação nem indicadores.

Próxima etapa: atribuição consentida e imutável por pedido, processamento de eventos, apuração do líquido e comissões. Carteira e gráficos desta fase são estados de indisponibilidade explícitos, sem saldos ou vendas fictícias.

Atualização: a implementação local posterior está descrita em [Fase 3](mbo-partners-phase3.md), incluindo seus limites de homologação financeira.
