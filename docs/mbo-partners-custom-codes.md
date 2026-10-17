# Códigos personalizados e painel real

Implementação e verificação em 2026-10-16.

- `/afiliados` não exibe o rodapé. Demonstração é desativada por padrão e só é oferecida quando a API verifica `has_role(auth.uid(), 'admin')`; developer/moderator não recebem a capacidade por esses papéis.
- Indicadores usam `affiliate_dashboard` e `affiliate_sales` da sessão autenticada. Cliques são registros consentidos, não visitantes únicos. Vendas válidas incluem pagamentos confirmados ainda com líquido em apuração. Comissões em segurança incluem somente registros conciliados. Carteira/saques continuam indisponíveis. Não foi implementado um novo conciliador de pagamentos.
- Código: 3–32 letras ASCII, números e hífens, normalizado para minúsculas; primeiro e último caracteres alfanuméricos. Verificação de disponibilidade autenticada e salvamento com versão, propriedade derivada da sessão e exclusividade transacional no banco.
- Códigos anteriores ficam reservados para o mesmo perfil e continuam resolvendo, desde que o perfil esteja aprovado e o rastreamento ativo. Nenhuma atribuição ou comissão existente é reescrita.

## Banco vinculado

Projeto conferido: `omkxiomwzbykmqttfozi`. Migração `20261016000100_affiliate_custom_codes` aplicada isoladamente após ensaio com rollback e verificação do corpo da função anterior de captura. Registro da migração e permissões conferidos na mesma transação.

O teste `supabase/tests/affiliate-custom-codes-hosted.sql` passou no banco instalado: salvamento, normalização, conflito de versão, registro privado e propriedade histórica. Todas as alterações desse teste foram revertidas. Nenhum código real foi personalizado pelo agente.

A consulta agregada antes da instalação retornou rastreamento ativo, zero vendas válidas, zero vendas com líquido em apuração e zero comissões conciliadas. Esse é um retrato da consulta, não um valor fixo do painel.

## Validação e publicação

TypeScript, lint dos arquivos alterados, testes de API, captura, atribuição/PGlite e interface passaram. A interface usou respostas simuladas para conferir usuário comum/admin, código ocupado, conflito no salvamento, atualização do link e larguras 320/390/1440. Não equivale a uma mudança feita por uma sessão real no navegador nem a uma transação de pagamento real. Concorrência simultânea entre sessões não foi exercitada; a exclusividade é implementada pelas restrições únicas do PostgreSQL.

O código da aplicação está local, sem publicação realizada nesta tarefa. O site público precisa receber o novo cliente e endpoint de captura para reconhecer códigos personalizados não hexadecimais. Os códigos antigos permanecem compatíveis. Publicar a aplicação antes de divulgar novos links personalizados no domínio público.
