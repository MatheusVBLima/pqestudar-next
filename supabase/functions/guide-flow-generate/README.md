# guide-flow-generate

Esta Edge Function aceita os campos enviados por `/admin/fluxo-guias`:

- `aiProvider`: `lovable` ou `openai`
- `textModel`: modelo textual escolhido na tela
- `imageModel`: modelo de imagem, hoje mantido no gateway do Lovable

Secrets necessarias:

```bash
supabase secrets set LOVABLE_API_KEY=...
supabase secrets set OPENAI_API_KEY=...
```

Depois de alterar a funcao:

```bash
supabase functions deploy guide-flow-generate
```

Observacao: a troca para OpenAI afeta a geracao textual do guia. A geracao de imagens continua usando o gateway Lovable enquanto nao houver suporte dedicado para imagens OpenAI nessa funcao.
