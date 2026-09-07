# Revisão de segurança — PqEstudar

Consultas realizadas em 5 e 6 de setembro de 2026. Repositório: `pqestudar-next`, HEAD observado `166e962`. Revisão solicitada após relato de aviso de segurança ao abrir `/ferramentas`.

## Conclusão

**Não foi confirmado um bloqueio atual do Google nem um comprometimento ativo. Foram confirmadas duas vulnerabilidades de execução de JavaScript em testes locais.** Essas conclusões são distintas: a ausência de aviso hoje não explica o que o seguidor viu e não elimina os riscos encontrados no código.

O relatório público do Google para `https://www.pqestudar.com.br/ferramentas` e `www.pqestudar.com.br` respondeu **“Nenhum conteúdo não seguro foi encontrado”**, com última atualização em **5 de setembro de 2026**. A consulta inicial sem `www` retornou “Não há dados disponíveis”. O resultado com `www` foi obtido posteriormente no navegador automatizado e está registrado em `content-review.json`.

Consulta pública: [Google Safe Browsing — ferramentas](https://transparencyreport.google.com/safe-browsing/search?url=https%3A%2F%2Fwww.pqestudar.com.br%2Fferramentas&hl=pt_BR).

## Escopo executado

- Inventário de 697 arquivos versionados, dos quais 681 em `src`, `supabase` e `public`; buscas estáticas transversais por execução dinâmica, scripts, HTML bruto, redirecionamentos e padrões comuns de credenciais. Isso não equivale à revisão manual integral de cada linha.
- Leitura dirigida das configurações, proxy, scripts externos, componentes de HTML/Markdown/JSON-LD, fluxos de autenticação, rotas administrativas, funções e políticas disponíveis localmente.
- Auditoria de dependências do `bun.lock` e conferência das versões efetivamente instaladas para os principais pacotes.
- Verificação TLS e cadeias HTTP/HTTPS, com e sem `www`.
- GET de todas as **61 URLs do sitemap**: todas retornaram 200. Nenhum padrão procurado de redirecionamento por meta refresh ou script inline suspeito foi sinalizado. Trata-se de heurística, não de antivírus nem avaliação integral de cada script.
- Leitura anônima das **35 ferramentas públicas** em `tools_public`: nenhum campo sinalizado pelos padrões de script, eventos HTML, `javascript:` ou HTML em URL de dados.
- Navegação em `/ferramentas` com Chromium, em desktop e emulação de Pixel 7, sem login; sessões sem consentimento e outras com consentimento de cookies para observar Analytics/AdSense. Não houve pop-up ou saída automática da página nas observações.
- Reprodução local e isolada das duas falhas de HTML, utilizando o código real carregado do repositório, conteúdo sintético e marcadores em memória. Nenhum payload foi gravado no banco ou enviado para páginas de produção.

## Achados prioritários

### 1. Sanitização de HTML permite execução de JavaScript — confirmado localmente

**Prioridade alta; dependência com advisory crítico.** `sanitize-html` instalado: **2.17.3**, embora o manifesto declare `^2.17.0`.

Em `src/lib/utils.ts`, a função `sanitizeHtml` usa `disallowedTagsMode: "discard"`. Um elemento `xmp` envolvendo uma imagem com manipulador de erro passou pela sanitização, preservou o manipulador e executou o marcador no navegador de teste. Resultado: `sanitizerRetainsEventHandler: true` e `sanitizerScriptExecuted: true`.

A função é usada em páginas de privacidade, termos e notícias. O ataque depende de conseguir introduzir conteúdo controlado nesses campos; não foi demonstrado acesso público de escrita nem encontrado conteúdo dessa natureza nas ferramentas examinadas. Não atribuir automaticamente esta falha ao alerta relatado em `/ferramentas`.

**Correção:** atualizar a biblioteca para uma versão fora de todas as faixas vulneráveis apontadas na auditoria e manter teste de regressão para esse caso. A versão 2.17.4 corrige o advisory crítico específico, mas há outros advisories que atingem versões posteriores: não encerrar a atualização apenas nesse mínimo.

Fonte: [advisory do mantenedor](https://github.com/apostrophecms/apostrophe/security/advisories/GHSA-rpr9-rxv7-x643), [registro GHSA](https://github.com/advisories/GHSA-rpr9-rxv7-x643).

### 2. JSON-LD permite escapar da tag script — confirmado localmente

**Prioridade alta.** `src/lib/seo/jsonld.tsx:17` injeta `JSON.stringify(data)` diretamente em uma tag `script`. O componente é usado em `/ferramentas`, onde nomes e slugs do catálogo participam do JSON-LD.

No teste com o componente real renderizado por React no servidor, um valor contendo fechamento da tag script e uma segunda tag executou um marcador no navegador: `jsonLdScriptEscapeExecuted: true`. Isso não foi testado com escrita no catálogo público e não foi encontrado nos 35 registros lidos.

O mesmo padrão aparece em `src/components/pages/ConcursoDetalheNext.tsx:375` e em outros produtores de JSON-LD; devem ser centralizados para evitar correções parciais. A explorabilidade de cada produtor depende de suas fontes de dados.

**Correção:** serializador único que escape `<` como `\u003c` antes da inserção em HTML, acompanhado de teste de regressão. A documentação local do Next já orienta essa proteção.

Fonte: [Next.js — JSON-LD](https://nextjs.org/docs/app/guides/json-ld).

### 3. Identidade no servidor obtida de sessão não validada — identificado no código

**Prioridade alta.** `src/lib/supabase-server.ts:46` chama `auth.getSession()` e retorna `session.user` como identidade. A própria documentação do SDK instalado adverte que esse objeto não deve ser confiado no servidor quando vem de cookies.

O caso mais sensível encontrado é `src/app/api/products/access/route.ts:56`: essa identidade é usada em uma consulta com cliente administrativo para decidir acesso a compras. Isso cria risco de confiar em dados de identidade adulterados. Não houve envio de cookies forjados nem consulta de dados de terceiros durante a revisão.

**Correção:** validar o usuário com `auth.getUser()` ou claims autenticadas e usar a identidade verificada nas consultas privilegiadas. Os checks de roles presentes em outras rotas são uma proteção adicional e não devem ser removidos.

### 4. Webhook Cakto aceita segredo ausente na configuração — condicional

**Prioridade alta se a variável estiver vazia em produção.** Em `supabase/functions/cakto-premium-webhook/index.ts:231`, a comparação do segredo só acontece quando `expectedSecrets.length > 0`. `supabase/config.toml` configura essa função com `verify_jwt = false`, como é comum para webhooks externos, tornando a validação própria indispensável.

Não foi conferido o valor da variável no ambiente implantado, nem enviados eventos de compra. Não é correto afirmar que o endpoint publicado está desprotegido com base apenas no código.

**Correção:** interromper a requisição quando não houver segredo configurado e confirmar a configuração no Supabase.

### 5. Dependências com advisories — confirmado no lockfile

A auditoria retornou alertas para **12 nomes de pacotes**. Isso não significa 12 falhas exploráveis nem comprometimento. Os avisos podem depender de recursos que a aplicação não usa.

| Pacote instalado | Observação |
| --- | --- |
| `next` 16.2.4 | Múltiplos advisories, incluindo bypass de proxy, cache e DoS; verificar aplicabilidade e atualizar a versão suportada. |
| `sanitize-html` 2.17.3 | Bypass confirmado com a configuração do projeto, conforme achado 1. |
| `dompurify` 3.4.2 | Alertas em funcionalidades/configurações específicas. Não foi demonstrado bypass na chamada de string usada pelo editor. |
| `pdfjs-dist` 5.7.284 | Advisory de execução de JavaScript ao processar PDF malicioso; usado nos importadores administrativos. Não foi aberto PDF malicioso durante a revisão. |
| `sharp` 0.34.5 e `ws` 8.20.0 | Alertas transitivos; revisar atualização e caminho de execução. |
| Outros | `brace-expansion`, `browserslist`, `js-yaml`, `nanoid`, `postcss`, `postcss-selector-parser`. |

As versões exatas, faixas vulneráveis e referências retornadas pelo registro estão em `dependencies.json`. Ao atualizar PDF.js, sincronizar também `public/pdf.worker.min.mjs` para não deixar worker e biblioteca em versões diferentes.

Referências primárias consultadas: [Next.js — bypass de proxy](https://github.com/vercel/next.js/security/advisories/GHSA-26hh-7cqf-hhc6), [PDF.js — execução de JavaScript](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j).

### 6. Prévia de e-mail sem isolamento — identificado no código

`src/components/pages/admin/AdminEmailsClient.tsx:3731` usa `iframe srcDoc={htmlBody}` sem `sandbox`. HTML com script nessa prévia pode executar no contexto do iframe com acesso de mesma origem. A tela é administrativa; não foi demonstrado um caminho de entrada anônima desse HTML.

**Correção:** prévia com sandbox que não permita scripts ou acesso de mesma origem, além de revisar a origem do HTML.

### 7. CSP ausente — defesa adicional

Os headers publicados incluem HSTS, `nosniff`, proteção contra framing e política de referência, mas não uma Content Security Policy. Isso não causa, por si só, a tela vermelha. Uma CSP pode reduzir impacto de injeção, mas precisa ser planejada e validada com Next, Supabase, AdSense e embeds; não inserir uma política genérica que quebre o site.

## Evidências favoráveis e limites

- Certificados de ambos os hosts foram aceitos pela validação TLS. Validade até **21 de outubro de 2026**, emissores Let's Encrypt YR1/YR2.
- HTTP redirecionou para HTTPS, o domínio sem `www` para `www`, e a página final respondeu 200. Nenhum destino estranho nessa cadeia.
- Após consentimento, os scripts externos observados eram Analytics e AdSense; os requests adicionais vinham de domínios de anúncios/qualidade de tráfego e reCAPTCHA do Google. Isso não certifica todos os anúncios possíveis, que variam por usuário, região e horário.
- Nenhum arquivo `.env` versionado foi encontrado no inventário atual. A busca por alguns padrões comuns de chaves privadas/segredos não encontrou correspondência no código examinado. Não foi feito um escaneamento completo de todos os commits históricos, segredos do deploy ou bundle de cada rota.
- O arquivo `public/axon/standalone.html` usa conteúdo empacotado em base64/gzip. Foram inspecionados o carregador e os metadados/domínios dos 10 assets decodificados; não há evidência suficiente para classificá-lo como malware. Esse teste por padrões não é uma análise completa dos assets.
- Não foram auditados logs privados da Vercel/Supabase, políticas efetivamente implantadas no banco, todos os uploads, dispositivos dos visitantes, respostas de todos os sites externos nem o relatório autenticado do Search Console.
- O Chromium automatizado não deve ser tratado como reprodução completa do Safe Browsing do Chrome do seguidor. A consulta pública ao Google é uma evidência separada.

## Próximos passos

1. Corrigir os achados 1 e 2 e validar regressões de conteúdo/edição; atualizar dependências com nova auditoria e build.
2. Corrigir identidade no servidor, exigir configuração do webhook e isolar a prévia de e-mail.
3. Conferir **Search Console → Segurança e ações manuais → Problemas de segurança** e histórico de alterações/deploys. O acesso autenticado não estava disponível nesta revisão.
4. Obter a captura completa do aviso do seguidor, incluindo endereço, navegador e data. Se aparecer `NET::ERR_CERT_*`, investigar a cadeia TLS/dispositivo/rede; se disser site enganoso/perigoso, confrontar com Search Console e anúncio/URL envolvidos.
5. Pedir revisão ao Google apenas se houver problema registrado e após a correção. Não orientar visitantes a ignorar o aviso.

Fonte: [Google — relatório de problemas de segurança](https://support.google.com/webmasters/answer/9044101?hl=pt-BR).

## Artefatos

- `public-review.json`: TLS, headers, navegação inicial, recursos e primeira consulta ao Google.
- `content-review.json`: 61 páginas, 35 ferramentas, anúncios, resultado com `www` e testes locais.
- `dependencies.json`: saída estruturada de advisories.
- `desktop.png` e `mobile.png`: capturas das sessões sem consentimento.
- `sitemap.xml`: sitemap observado.
- Scripts reproduzíveis: `scripts/security-review-public.mjs` e `scripts/security-review-content.mjs`.

Nenhum arquivo de aplicação, registro do banco, dependência ou deploy foi alterado nesta auditoria; foram adicionados apenas scripts e evidências locais. Não foi realizado commit ou push.
