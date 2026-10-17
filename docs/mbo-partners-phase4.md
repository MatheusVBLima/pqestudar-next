# MBO Partners — carteira e saques manuais

Implementação de 17/10/2026. Preserva o checkout, o login, o controle Premium e o painel administrativo existentes.

Migração aplicada no banco vinculado após ensaio com rollback. Consultas protegidas de carteira e administração passaram no banco remoto. Conferência posterior: uma comissão existente, zero lançamentos e zero saques; nenhum saldo fictício foi criado. Chave de criptografia local configurada sem exposição. TypeScript, lint dos novos módulos e testes SQL/API/UI passaram; capturas em `test-results/affiliates/wallet-*.png`.

## Fluxo implementado

- Carteira do afiliado: valores em segurança, disponíveis, reservados e pagos; extrato e histórico paginados; formulário Pix com validação e confirmação de titularidade.
- Mínimo inicial de R$ 50,00, configurável no administrador. Segurança inicial de 30 dias; mudanças valem para novas confirmações, preservando datas já registradas.
- Reserva atômica de saldo, chave de idempotência e apenas uma solicitação aberta por afiliado. Limite de cinco solicitações por hora. Suspensos não solicitam nem avançam saques.
- Administração: análise → aprovação → processamento → pago. Rejeição/falha devolve a reserva uma única vez. Pagamento exige referência única, comprovante privado (PDF/PNG/JPEG até 2 MB) e conferência explícita da transferência concluída no banco.
- O sistema **não envia Pix**. A declaração do administrador e o comprovante são evidência manual; não há validação bancária automática do comprovante.
- Chaves Pix criptografadas com AES-256-GCM, vinculadas ao usuário como AAD. Somente o administrador autorizado pode revelar a chave; cada consulta é auditada. Listagens retornam apenas máscara. Chave e comprovante nunca são públicos.
- Lançamentos e tentativas são imutáveis. As RPCs verificam identidade/permissões no banco. Tabelas privadas com RLS e sem permissões diretas para clientes ou service role.

## Liberação e estornos

`affiliate_release_commission` exige conciliação existente, prazo cumprido, afiliado ativo e pedido real ainda pago, não revogado e sincronizado há menos de dois minutos. O endpoint administrativo consulta novamente o pedido oficial no Mercado Pago antes da liberação. Nenhuma taxa é estimada.

A comissão conserva o registro histórico de apuração; o extrato registra sua liberação. A API de vendas mostra `released` e remove o valor do indicador “Em segurança”. Reservas e pagamentos pertencem à carteira agregada e à solicitação, sem fingir alocação individual de uma comissão a um saque parcial.

Um estorno de comissão liberada rejeita conservadoramente **todos** os saques ainda abertos daquele afiliado e devolve suas reservas; depois lança o débito da comissão. O total pago é preservado. Saldo negativo aparece como valor a recuperar no administrador e é compensado por créditos futuros. Não existe cobrança externa automática. Ações automáticas no histórico têm `actor_id = null`; ações humanas identificam o administrador.

Antes de registrar um saque como pago, o servidor reconcilia novamente os pedidos liberados do afiliado. Uma mudança concorrente de status/version impede a confirmação obsoleta. Como a transferência ocorre fora do sistema, o administrador deve atualizar a análise imediatamente antes de transferir. Se já tiver transferido e ocorrer uma rejeição concorrente, a equipe precisa investigar a exceção com o comprovante; não repetir a transferência.

## Configuração e operação

`AFFILIATE_PIX_ENCRYPTION_KEY` deve ser uma chave aleatória de 32 bytes em hexadecimal, apenas no servidor. `node scripts/configure-affiliate-wallet-local.mjs` cria a configuração somente no `.env.local` ignorado pelo Git, sem imprimir ou substituir uma chave existente. Preserve essa chave em armazenamento seguro: substituí-la torna as chaves Pix antigas ilegíveis. Não enviar em chats, logs ou variáveis `NEXT_PUBLIC_*`.

O ambiente hospedado precisa receber a mesma chave pelo gerenciador seguro de segredos antes de processar solicitações iniciadas localmente. Configuração ausente mantém a consulta disponível, mas bloqueia novos saques. Este trabalho não publica o código nem configura segredos na hospedagem.

Migração: `20261017000100_affiliate_wallet.sql`. O preparador gera ensaio com rollback e aplicação transacional com hashes de dependências, verificação de grants e registro no histórico. Não executar `db push` em massa: permanece a divergência histórica das migrações do projeto.

## Validação e limites

- `affiliate-wallet-sql.test.mjs`: migrações reais em PGlite; isolamento, centavos, prazo/apuração, idempotência, reservas, estorno antes/depois do pagamento, recuperação, suspensão e imutabilidade.
- `affiliate-wallet-api.test.mjs`: autenticação, origem, validação estrita, criptografia, ausência de configuração, falha na consulta oficial e exigência de comprovante; dependências HTTP simuladas.
- `affiliate-wallet-ui.test.mjs`: interfaces em 390/1440 px, saldo zero, formulário, valor em centavos, consulta administrativa e erro recuperável; API fictícia, sem saques reais.
- `affiliate-wallet-hosted.sql`: consultas sob papéis reais `authenticated`, com claims em transação revertida; não equivale a login real no navegador.
- Locks de perfil e restrições protegem reservas concorrentes. O teste PGlite não prova disputa entre conexões PostgreSQL independentes; esse ensaio segue pendente.

Na conferência do banco real havia uma comissão e nenhuma conciliação financeira. A integração automática que obtém e valida o valor líquido oficial ainda precisa ser concluída; a RPC existente `affiliate_reconcile_net` permanece restrita ao servidor. Não inserir um valor estimado para desbloquear a carteira. Uma venda real conciliada, liberação após prazo e saque manual real com comprovante ainda precisam ser validados de ponta a ponta antes de considerar o fluxo financeiro pronto para lançamento.
