# Suporte da home

O botão do FAQ abre `SupportDialog` e envia para `POST /api/support`.
As mensagens estão no menu **Suporte** do admin (`/admin/suporte`), com busca
por assunto, paginação e leitura completa. Também podem ser consultadas em
**Supabase > Table Editor > support_messages**.
Somente admin/developer podem consultar pelo cliente autenticado; visitantes não
podem consultar nem inserir diretamente. O formulário envia um código de
confirmação por e-mail via Resend, sem criar uma conta de usuário.

Fluxo: preencher -> `action: request` -> código -> `action: verify` -> mensagem.
A API rejeita o envio direto antigo. O desafio guarda assunto, descrição e e-mail
no servidor; a confirmação aceita apenas o ID do desafio e o código, sem permitir
trocar o conteúdo ou destinatário. A tabela privada `support_email_challenges`
não aparece no admin. Só a confirmação cria `support_messages`, com
`email_verified_at`. Registros anteriores conservam esse campo vazio.

Código aleatório de seis dígitos, guardado apenas como HMAC com a chave do servidor,
validade de dez minutos e cinco tentativas. Confirmar novamente o mesmo desafio
não duplica a mensagem. Reenvios invalidam os códigos anteriores. O banco limita
solicitações por e-mail e origem: uma por minuto, cinco por hora e dez por janela
móvel de 48 horas. Pedidos recusados pelo provedor também consomem a cota.
Os desafios com mais de 48 horas são removidos na próxima solicitação; o conteúdo
de desafios expirados é limpo nessa mesma manutenção. Após confirmar, o conteúdo
do desafio é limpo imediatamente, preservando apenas a mensagem verificada.

Limites atômicos no banco: uma mensagem por minuto e cinco por janela móvel de
48 horas, por e-mail normalizado e por hash da origem. Trocar apenas o e-mail não
contorna o limite da origem. Redes compartilhadas compartilham o limite.
Assunto: 3–120 caracteres. Descrição: 10–5.000. E-mail: formato válido, até 254;
o código confirma acesso à caixa, não identidade pessoal nem uso permanente.
Não há lista de bloqueio de provedores temporários: eles também podem receber
códigos, por isso os limites por origem continuam indispensáveis.

Publicação requer `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no
servidor, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` com remetente autorizado no Resend,
e as migrações `20260911000300` e `20260912000100`. Nunca expor chaves ao navegador.
Publicar a nova API e o modal juntos. A função interna de gravação mantém acesso
somente ao servidor confiável para compatibilidade durante a publicação; clientes
anônimos/autenticados não conseguem chamá-la diretamente.
Na Vercel, a origem usa `x-vercel-forwarded-for` e é armazenada apenas como HMAC.
Referência: https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
Fora da Vercel, os envios usam um limite compartilhado conservador: configurar
explicitamente um proxy confiável antes de publicar em outra hospedagem.
Esses limites restringem gravações; não substituem proteção contra ataques
distribuídos na camada de hospedagem.

Verificações:
- `node scripts/support-api.test.mjs` (API com banco simulado).
- `node scripts/support-dialog.test.mjs` (interface real em navegador, envio simulado).
- `supabase/tests/support_messages.sql` (banco real, transação com rollback).
- `supabase/tests/support_email_verification.sql` (códigos, reenvios, limites e privacidade, rollback).
