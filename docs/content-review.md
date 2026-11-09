# Central de revisão

Rota: `/admin/revisao-conteudo`. Entrada na seção Conteúdo do menu administrativo, visível apenas para `isAdmin`.

A busca mantém as mesmas dimensões compactas antes e depois da consulta. Os seletores usam o componente Radix Select padrão do dashboard. O conteúdo abre no mesmo `MarkdownEditor` do Fluxo, com Visual, Markdown, Pré-visualizar e ferramentas de formatação. A aba Trechos analisados preserva a seleção dos diagnósticos por trecho.

Edições manuais usam `content_review_save_manual`, instalada pela migração `20261108010000_content_review_manual_edit.sql`. Exigem admin, comparam a versão carregada e gravam alteração e histórico na mesma transação. São identificadas como `manual_edit`, sem inventar fontes ou aprovação pela IA. Podem ser desfeitas pela RPC existente. Alterações locais precisam ser salvas ou descartadas antes de abrir outro conteúdo ou iniciar nova análise. O editor funciona sem chamadas à IA.

Quando um guia tem imagens inseridas pelo fluxo, a gravação preserva o estado de criação. Se uma edição abrangente não puder ser aplicada com segurança ao texto do fluxo salvo, a central bloqueia o salvamento e orienta editar no Fluxo; ela não apaga imagens nem configurações para forçar a gravação.

A página e a API verificam a identidade com `auth.getUser()` e exigem exatamente `has_role(user.id, 'admin')`. A Edge Function repete essa verificação. Desenvolvedor e moderador sem admin não têm acesso. RLS protege análises e histórico; clientes autenticados podem apenas ler essas tabelas quando admins. A RPC de correção verifica admin novamente.

## Fluxo

1. Buscar título, tema ou rota de guia, ferramenta ou curso. Cursos usam `premium_items` com `item_type=course`, excluindo benefícios, e abrem `/premium/cursos/[slug]`. A antiga tabela `courses` não alimenta o catálogo atual.
2. Abrir o conteúdo e iniciar uma análise. Uma fotografia dos campos é salva antes da extração de até 30 afirmações. Páginas com mais de 60 mil caracteres são recusadas explicitamente.
3. Pesquisar cada afirmação com OpenAI Responses + `web_search`, priorizando fontes oficiais. Uma segunda etapa classifica a evidência. URLs propostas pelo modelo só são aceitas quando também constam no retorno da pesquisa/citações do provedor.
4. Mostrar confirmado, contradito, incerto, não verificado ou editorial. Sem fonte, nunca confirmar nem marcar como falso. O texto sem marcação não foi verificado. As evidências exibidas são sínteses, não citações literais certificadas.
5. Editar e selecionar propostas, conferir antes/depois e confirmar aplicação. Apenas trechos únicos com evidência e diagnóstico contradito/incerto podem ser alterados.
6. Consultar o histórico e desfazer. Um conflito de conteúdo bloqueia aplicação/desfazer. Contadores de visitas não invalidam a revisão.

Correções e histórico são gravados na mesma transação. Publicação, slug e URLs não são alterados pela correção. Em guias, o texto correspondente no `flow_data` é sincronizado preservando entradas e imagens; se o trecho divergir do fluxo salvo, a correção é bloqueada. Uma revisão aplicada não pode ser aplicada novamente. Desfazer exige uma nova análise para editar novamente.

## Backend

- Migração: `supabase/migrations/20261107190000_content_review.sql`.
- Função: `supabase/functions/content-review/index.ts`.
- Secret obrigatório: `OPENAI_API_KEY` compatível com a API oficial em `https://api.openai.com/v1/responses`.
- Opcional: `CONTENT_REVIEW_MODEL`; padrão `gpt-5.4`. O modelo deve suportar Responses, web search e saída JSON. A central não usa `OPENAI_BASE_URL` de gateways legados.
- `verify_jwt=false` no gateway não libera o recurso: a própria função exige token de usuário válido e papel admin antes de ler dados ou chamar o provedor.
- Limite de 30 análises por administrador por janela de 24 horas; até 30 afirmações por análise. A pesquisa gera consumo no provedor. As verificações concluídas são reutilizadas ao continuar. Uma concessão temporária de 4 minutos evita pesquisas simultâneas sobre a mesma análise; após falha a concessão é liberada.
- Fontes sugeridas aceitam até 5 URLs HTTPS públicas. A aplicação não faz fetch direto das URLs fornecidas; elas são pistas para a pesquisa hospedada.
- Apenas a alteração confirmada gera revalidação dos caches públicos. Sem agendamento automático nesta versão.

Referência do provedor: https://developers.openai.com/api/docs/guides/tools-web-search

## Verificação

- `node scripts/content-review.test.mjs`: correspondência literal, sobreposição, fontes desconhecidas, URLs e substituição.
- `node scripts/content-review-ui.test.mjs`: interface real com API simulada, geometria em 1440/390 px, fontes, confirmação, aplicar e desfazer. Cria uma rota local ignorada e remove o arquivo no encerramento; não execute build enquanto ela estiver ativa.
- `scripts/content-review-db.test.sql`: executar **dentro de transação com rollback**; testa RPC/RLS/admin, escrita de evidências proibida, aplicação, histórico, desfazer e conflito. Nunca executar isoladamente sem rollback. Usa um administrador já existente como identidade simulada apenas dentro da transação; não cria sessão de usuário.

O teste visual simulado e a transação SQL não substituem a verificação de pesquisa real com uma sessão admin. A presença do secret não comprova saldo, acesso ao modelo ou compatibilidade da chave com a API oficial.

O tratamento de erros lê `error.code`/`error.type` retornados pelo provedor, incluindo códigos de saldo esgotado, limites de gastos do projeto/organização e limites de uso. Apenas códigos conhecidos de limitação temporária permitem uma nova tentativa, no máximo uma vez, respeitando `Retry-After` quando o intervalo cabe em até 8 segundos. Solicitações grandes demais, limites financeiros e códigos desconhecidos não são repetidos automaticamente. Um HTTP 429 desconhecido é apresentado como não classificado. Credencial/permissão recusada e modelo indisponível têm mensagens próprias. Logs guardam status, código limitado e request ID, nunca a chave ou o corpo da requisição. A mensagem específica também é preservada nas extrações que falharam. Corrigir a mensagem não regulariza o faturamento da conta. Referência: https://developers.openai.com/api/docs/guides/error-codes

Teste adicional de escrita manual: `scripts/content-review-manual.test.sql`, sempre dentro de transação com rollback. Valida admin, campos permitidos, formatação, histórico, conflito e desfazer.

`node scripts/content-review-provider.test.mjs` valida o tratamento real da função com respostas simuladas do provedor: cota, gastos, espera, nova tentativa limitada, requisição grande e código desconhecido. Não substitui uma pesquisa real autorizada.

## Modelos por etapa

A opção Gráfico apresenta uma pizza dos status da análise selecionada, com legenda acessível, quantidades e percentuais. Inclui afirmações não verificadas e editoriais no denominador; não representa cobertura do guia. Análises vazias mostram um estado informativo, e um único status ocupa o círculo inteiro. A visualização usa os resultados já salvos, sem nova chamada de IA.

A interface agrupa Resultado, Histórico e Modelos em uma barra que acompanha a rolagem. Resultado reúne avisos, cobertura e contagens; Histórico separa análises de alterações; Modelos fecha após “Usar estes modelos”. Os diagnósticos são cartões expansíveis, sincronizados com a seleção no texto. A busca usa largura máxima de 760 px e a paleta semântica do admin, sem brilho azul.

### Precisão e cobertura
Novas análises segmentam frases mantendo os trechos literais. Cada afirmação contém `aspects`; o diagnóstico retorna `checks` com status, motivo e fontes para cada ponto. Uma confirmação global sem checks completos e URLs presentes nas evidências é rebaixada para confirmação pendente. Isso reduz confirmações excessivas, mas continua sendo uma avaliação por IA, não uma garantia de verdade. Análises antigas recebem aviso para nova execução.

A cobertura conta blocos de texto inteiramente, parcialmente e não analisados usando os intervalos dos trechos pesquisados no snapshot. Cabeçalhos Markdown e blocos de imagem/código são excluídos. “Analisadas” não significa “confirmadas”. No modo de trechos, Markdown é renderizado sem HTML cru; marcações usam posições da árvore de texto, preservando títulos, imagens, links e formatação. Cabeçalhos vazios são omitidos apenas na visualização, sem alterar o conteúdo salvo.
O administrador escolhe provedor e modelo textual (Lovable/Gemini ou OpenAI) e, separadamente, modelo OpenAI para pesquisa web. `provider`, `text_model` e `search_model` ficam salvos na análise. Retomar mantém as escolhas originais. A extração seleciona IDs de segmentos imutáveis; o servidor recupera o Markdown original. Uma extração sem afirmações válidas falha explicitamente, sem declarar o conteúdo correto. A classificação final usa o modelo textual e somente fontes retornadas pela pesquisa. Não há fallback silencioso entre provedores.

Análises antigas vazias mostram um alerta para iniciar novamente. Resultados da busca recolhem ao abrir uma página e podem ser expandidos. Testes de segmentos, provedores e interface cobrem preservação de acentos, seleção independente, encaminhamento dos modelos e recolhimento da lista. Pesquisa real continua dependente do saldo dos provedores.
