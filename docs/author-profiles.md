# Perfis de autores e conquistas

## Rotas e edição

- `/autores`: endereço antigo, redireciona para a gestão protegida em `/admin/autores`; não exibe listagem pública.
- `/autores/[slug]`: apresentação, formação/experiência declarada, foto por URL HTTPS, links, guias publicados e conquistas.
- `/autores/meu-perfil`: o moderador edita o próprio perfil, pelo menu do moderador.
- `/admin/autores`: listagem e gestão no menu **Conteúdo → Autores dos guias**, ao lado de Guias. Administradores criam e editam perfis editoriais e vinculam uma conta após conferir sua identidade. Mantém a proteção existente do dashboard.
- Os visitantes chegam aos perfis individuais pela autoria dos guias; o perfil oferece retorno a `/guias`.
- Os editores comum e de fluxo têm seleção explícita do perfil. O banco impõe a autoria própria para novos guias de moderadores, independentemente do payload.

`author_id` é a identidade editorial pública. `created_by` continua sendo a propriedade do guia para controle de edição. Não inferir a conta de uma pessoa a partir do nome nem conceder função de moderador automaticamente a afiliados.

## Apresentação administrativa

Cards verticais exibem foto (ou iniciais), nome, apresentação curta, todas as conquistas reais e tempo desde o cadastro do perfil. A data exibida vem de `author_profiles.created_at`: não representa uma data histórica de início como escritor, desconhecida para perfis legados. A legenda explicita a data de cadastro.

A listagem permite buscar nome/apresentação e ordenar por nome ou cadastro recente. O formulário é dividido em identidade, trajetória, links, conquistas e conta responsável, com prévia ao vivo. Bordas, sombras e cores usam os tokens do dashboard. Os selos usam ícones vetoriais nesta etapa; a futura arte em imagem pode substituir o componente `AuthorMedal`.

`node scripts/author-admin-ui.test.mjs` verifica proporções verticais, ausência de overflow, busca, estado vazio, cadastro, prévia e consulta de conquistas com dados fictícios, sem escrever no banco.

## Regras automáticas

- 1, 10 e 50 guias atualmente publicados: Primeiro guia, Autor em ação e Voz de referência.
- Pelo menos 2 guias publicados em cada uma de 3 categorias: Conhecimento plural. Categorias vazias não contam.
- 10 guias atualmente publicados em uma categoria pública (fallback: categoria editorial): Contribuidor de [categoria].
- Primeira publicação de pelo menos um guia por mês em 3 ou 6 meses consecutivos, no fuso `America/Sao_Paulo`: Presença constante e Compromisso com o conhecimento.
- O banco registra cada conquista uma única vez, com data, e gera uma notificação para a conta vinculada.
- As conquistas permanecem no histórico após despublicação. Rascunhos não contam. Republicar não altera a primeira publicação nem repete a notificação.
- Todas as conquistas aparecem automaticamente no perfil, sem seleção de destaques. O campo legado featured_badges não controla a exibição.
- Leituras, votos, ranking mensal e formação verificada não estão incluídos nesta versão.

## Migração e ordem de ativação

Aplicar `supabase/migrations/20261024000100_author_profiles.sql` para ativar os perfis e selos. A migração depende das tabelas existentes de guias, funções de roles, notificações e permissões de moderador. Até a ativação, a listagem pública reconhece a ausência de `author_id` e consulta as colunas antigas; falhas na consulta opcional de perfis preservam a autoria textual dos guias. O diretório de autores mantém seu estado de erro, sem fingir que o recurso foi ativado.

O backfill preserva os nomes já creditados em guias publicados, criando perfis editoriais sem conta vinculada. Não publica nomes encontrados somente em rascunhos e não usa e-mail/metadados privados. Nomes idênticos existentes formam um perfil editorial; casos de homônimos devem ser separados explicitamente no admin. URLs legadas incluem nome normalizado e sufixo estável para evitar colisões.

Os guias já publicados recebem a data da ativação como primeiro registro conhecido. Não usamos `created_at` ou `updated_at` para inventar uma data histórica de publicação. Assim, os selos de volume existentes são reconhecidos na ativação; a constância passa a ser medida a partir dela.

Após a migração, revisar os perfis legados em `/admin/autores`, preencher apresentação e links reais e vincular as contas corretas quando necessário. Os endereços ficam imutáveis para preservar links.

## Validação

- `node scripts/author-profiles-sql.test.mjs`: PostgreSQL local em PGlite, com a migração real e as regras existentes de propriedade. Usa a instalação de PGlite em `test-results/mercado-pago-sql/node_modules` já utilizada pelos testes de pagamentos/afiliados.
- `node scripts/author-profiles-ui.test.mjs`: componentes reais com dados fictícios e respostas interceptadas, em servidor Next local na porta 3000 (configurável por `AUTHOR_PREVIEW_ORIGIN`). Cria e remove uma rota temporária. Capturas em `test-results/authors`.
- TypeScript e ESLint nos arquivos alterados.

Esses testes não equivalem à aplicação da migração, deploy ou sessão real. Para concluir a validação no ambiente publicado: entrar como usuário comum, moderador proprietário, outro moderador e administrador; confirmar edição permitida/negada, publicar um guia real autorizado e verificar `author_badges`, notificação persistida e o perfil público.

## Atualização de conquistas (2026-10-30)

Migração `20261030000100_author_badge_milestones.sql` aplicada ao Supabase vinculado. Reavalia os perfis existentes, preserva datas de conquistas e não duplica notificações. Cada marco conquistado permanece visível, conforme a decisão de exibir todas as conquistas. Os testes SQL cobrem também seis meses consecutivos, variedade e reexecução do backfill.

## Autor pioneiro

Migração `20261030000200_author_pioneers.sql`: os primeiros 20 perfis editoriais distintos que obtiverem `published-1` recebem `pioneer-20`. O grupo inicial inclui todos os contribuidores já reconhecidos; se ultrapassar 20, a migração aborta para resolver a elegibilidade sem inventar ranking histórico. A capacidade usa uma linha bloqueada transacionalmente, e as reservas privadas permanecem mesmo após exclusão de perfil. Rascunhos, cadastro e republicação não ocupam vagas extras. O selo usa bandeira dourada e a notificação existente. Testes SQL cobrem grupo inicial, esgotamento, idempotência, exclusão e permissões; não simulam conexões concorrentes reais.

## Niveis visuais

O mapeamento em `src/lib/author-badge-levels.ts` usa prata para primeiro guia; azul para 10 guias e 3 meses; violeta para categoria e variedade; esmeralda para 50 guias e 6 meses; dourado exclusivo para pioneiro. Molduras diferenciam os niveis alem da cor. O tooltip informa o nivel. As regras de concessao nao mudam.
