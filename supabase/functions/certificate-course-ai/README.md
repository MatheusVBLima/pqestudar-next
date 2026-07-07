# certificate-course-ai

Laboratório administrativo do produto **Certificado que Conta**.

## Pré-requisitos

1. Executar a migration `20260705000100_certificate_course_ai_lab.sql`.
2. Configurar pelo menos um dos secrets:

```bash
npx.cmd --yes supabase secrets set LOVABLE_API_KEY=...
npx.cmd --yes supabase secrets set OPENAI_API_KEY=...
```

3. Publicar a função:

```bash
npx.cmd --yes supabase functions deploy certificate-course-ai
```

## Ações

- `getConfig`: retorna configuração, modelos permitidos e presença dos secrets.
- `saveConfig`: troca provedor, modelos, fallback e limites.
- `healthcheck`: faz uma chamada mínima ao provedor escolhido.
- `analyze`: avalia um curso e registra tokens, custo estimado e duração.
- `listRuns`: retorna as últimas medições do laboratório.

Todas as ações exigem usuário autenticado com papel `admin`.
