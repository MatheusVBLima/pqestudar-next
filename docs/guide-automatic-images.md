# Imagens automáticas dos guias

## Ativação

1. Aplicar a migração `20261105000100_guide_image_library.sql` no projeto Supabase correto.
2. Publicar a função `guide-flow-generate`, incluindo `_shared/guide-auto-images.ts` e sua dependência local `src/lib/guide-sections.ts`.
3. Publicar o frontend. A migração deve anteceder a disponibilização da interface.
4. Na biblioteca, aba de imagens, abrir imagens existentes ou enviar PNG/JPEG/WebP. Cadastrar descrição visual, termos específicos, função, fonte e licença; aprovar somente materiais com direitos de reutilização sem crédito obrigatório na página. Nesta versão, a origem fica no editor; não há crédito público automático.
5. Selecionar **Automático com biblioteca** no modo visual e gerar um rascunho.

## Comportamento

- Nenhuma chamada ao modelo de geração de imagens. A chamada normal de geração de texto continua existindo.
- Seleção lexical conservadora: função exata, pelo menos dois termos coincidentes e cobertura de 60% dos termos cadastrados. Não é análise visual nem probabilidade estatística de precisão.
- Acervo consultado: até 1.000 registros aprovados. Não repetir um asset no mesmo guia; desempatar pela frequência observada em até 200 guias salvos.
- Até duas imagens internas automáticas. Sem correspondência, deixar uma posição opcional para revisão, além da capa pendente quando necessário.
- Diagramas: sequências numeradas de 3 a 5 passos curtos, sem sublistas, código ou conteúdo indentado. Texto escapado em SVG, com identificação de esquema ilustrativo. Nenhum fato adicional é gerado.
- Diagramas enviados ao bucket público `guide-diagrams`, com escrita apenas pelo servidor. Assets originais permanecem em `guide-covers`.
- Imagens podem ser trocadas pelo seletor no editor do card; remover pelo menu do fluxo. O estado salvo preserva fonte, licença e origem da seleção.
- Cadastro pode ser lido pelos papéis admin, developer e moderator; apenas admin e developer podem alterar/aprovar, conforme RLS.

## Verificação antes de liberar em produção

Executar `node scripts/guide-flow-generation.test.mjs` e TypeScript. Em sessão real, confirmar RLS com cada papel, envio de imagem, leitura pública do SVG, seleção/troca, salvar rascunho, reabrir e conferir a página renderizada. Os testes locais usam serviços simulados e não comprovam implantação ou políticas no banco remoto.

Não houve importação automática ou aprovação em massa de imagens antigas. O cadastro inicial exige revisão única para evitar reutilizar imagens inadequadas ou sem direitos conhecidos. Comparativos, capturas de tela e busca em bancos externos ficam fora desta primeira versão.
