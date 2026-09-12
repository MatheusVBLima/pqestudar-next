import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function failure(code: string) {
  const messages: Record<string, string> = {
    rate_limit: 'Limite atingido. Aguarde 1 minuto entre códigos. São permitidos 5 códigos por hora, 10 em 48 horas e 5 mensagens em 48 horas.',
    invalid_code: 'Código incorreto. Confira o e-mail e tente novamente.',
    expired_code: 'Código expirado. Solicite um novo código.',
    locked_code: 'Limite de tentativas atingido. Solicite um novo código.',
  };
  return Response.json({ error: messages[code] || 'Não foi possível confirmar.', code }, { status: code === 'rate_limit' || code === 'locked_code' ? 429 : 400 });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  try {
    // Bound the streamed body too: Content-Length alone can be absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: 'Preencha os campos.' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        return Response.json({ error: 'Mensagem muito longa.' }, { status: 413 });
      }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('Support configuration missing');
    const admin = createSupabaseAdminClient();
    const hashCode = (id: string, code: string) => createHmac('sha256', key).update(`support-code:${id}:${code}`).digest('hex');
    if (body?.action === 'verify') {
      if (typeof body.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.id) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
        return failure('invalid_code');
      }
      const { data, error } = await admin.rpc('confirm_support_code', { p_id: body.id, p_code_hash: hashCode(body.id, body.code) });
      if (error || !data) throw new Error('Support verification failed');
      if (data.error) return failure(data.error);
      if (!data.id) throw new Error('Missing confirmed message');
      return Response.json({ id: data.id }, { status: 201 });
    }
    if (body?.action !== 'request') return Response.json({ error: 'Atualize a página para confirmar seu e-mail antes de enviar.' }, { status: 400 });
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 3 || subject.length > 120 || description.length < 10 || description.length > 5000) {
      return Response.json({ error: 'Informe um e-mail válido, assunto de 3 a 120 caracteres e descrição de 10 a 5.000 caracteres.' }, { status: 400 });
    }
    const mailKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!mailKey || !from) throw new Error('Support email configuration missing');
    // Trust only Vercel's overwritten header, never arbitrary X-Forwarded-For.
    // Other deployments share a restrictive bucket until a trusted proxy is configured.
    const forwarded = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null;
    const origin = forwarded && isIP(forwarded) ? forwarded : 'shared-origin';
    const originHash = createHmac('sha256', key).update(`support:${origin}`).digest('hex');
    const id = randomUUID();
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    const { data, error } = await admin.rpc('request_support_code', {
      p_id: id, p_email: email, p_subject: subject, p_description: description, p_origin_hash: originHash, p_code_hash: hashCode(id, code),
    });
    if (error || !data) throw new Error('Support persistence failed');
    if (data.error) return failure(data.error);
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${mailKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `support-code/${id}` },
      body: JSON.stringify({ from, to: [email], subject: 'Seu código de confirmação — Suporte PqEstudar',
        text: `Seu código de confirmação é: ${code}\n\nEle expira em 10 minutos. Digite-o no site para enviar sua mensagem ao suporte PqEstudar.\n\nSe você não solicitou este código, ignore este e-mail.` }),
    });
    if (!delivery.ok) {
      await admin.from('support_email_challenges').update({ expires_at: new Date().toISOString(), subject: null, description: null }).eq('id', id);
      throw new Error('Support email delivery failed');
    }
    return Response.json({ challengeId: id, expiresIn: 600, resendAfter: 60 }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível enviar. Tente novamente mais tarde.' }, { status: 503 });
  }
}
