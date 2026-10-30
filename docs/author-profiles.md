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

Cards verticais exibem foto (ou iniciais), nome, apresentação curta, até três conquistas reais e tempo desde o cadastro do perfil. A data exibida vem de `author_profiles.created_at`: não representa uma data histórica de início como escritor, desconhecida para perfis legados. A legenda explicita a data de cadastro.

A listagem permite buscar nome/apresentação e ordenar por nome ou cadastro recente. O formulário é dividido em identidade, trajetória, links, conquistas e conta responsável, com prévia ao vivo. Bordas, sombras e cores usam os tokens do dashboard. Os selos usam ícones vetoriais nesta etapa; a futura arte em imagem pode substituir o componente `AuthorMedal`.

`node scripts/author-admin-ui.test.mjs` verifica proporções verticais, ausência de overflow, busca, estado vazio, cadastro, prévia e seleção de conquistas com dados fictícios, sem escrever no banco.

## Regras automáticas

- 1, 10 e 50 guias atualmente publicados: marcos de contribuição.
- 10 guias atualmente publicados em uma categoria pública (fallback: categoria editorial): referência na categoria.
- Primeira publicação de pelo menos um guia por mês em três meses consecutivos, no fuso `America/Sao_Paulo`: autor consistente.
- O banco registra cada conquista uma única vez, com data, e gera uma notificação para a conta vinculada.
- As conquistas permanecem no histórico após despublicação. Rascunhos não contam. Republicar não altera a primeira publicação nem repete a notificação.
- Até três selos conquistados podem ser escolhidos como destaques. Códigos inventados no campo de preferências nunca são exibidos como conquistas.
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
