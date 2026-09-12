"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function SupportDialog() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const locked = useRef(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ email: '', subject: '', description: '' });
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  async function send(action: 'request' | 'verify') {
    if (locked.current) return;
    locked.current = true;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'verify' ? { action, id: challengeId, code } : { action, ...draft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar. Tente novamente.');
      if (action === 'verify') {
        setSent(true);
        setChallengeId('');
        setCode('');
        setDraft({ email: '', subject: '', description: '' });
      } else {
        setChallengeId(result.challengeId);
        setCode('');
        setRetryAt(Date.now() + result.resendAfter * 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha de conexão. Tente novamente.');
    } finally { locked.current = false; setSending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(challengeId ? 'verify' : 'request');
  }
  return <Dialog open={open} onOpenChange={value => { if (!locked.current) { setOpen(value); if (value) { setSent(false); setError(''); } } }}>
    <DialogTrigger asChild><Button className="gap-2">Falar com suporte<ArrowRight className="h-4 w-4" /></Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" data-heatmap-ignore>
      {sent ? <div className="flex flex-col items-center px-2 py-6 text-center" role="status">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <DialogHeader className="items-center text-center sm:text-center">
          <DialogTitle className="text-2xl">Mensagem enviada!</DialogTitle>
          <DialogDescription className="max-w-sm leading-relaxed">Recebemos sua mensagem. Nossa equipe poderá entrar em contato pelo e-mail informado.</DialogDescription>
        </DialogHeader>
        <Button className="mt-7 min-w-32" onClick={() => setOpen(false)}>Concluir</Button>
      </div> : challengeId ? <>
        <DialogHeader><DialogTitle>Confirme seu e-mail</DialogTitle><DialogDescription>Enviamos um código para <span className="break-all font-medium text-foreground">{draft.email.trim()}</span>. Sua mensagem será enviada após a confirmação.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="support-code">Código de 6 dígitos</Label><Input id="support-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus disabled={sending} className="text-center text-2xl tracking-[0.35em]" /><p className="text-xs text-muted-foreground">Válido por 10 minutos. Confira também a pasta de spam.</p></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={sending || code.length !== 6}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar e enviar mensagem</Button>
          <div className="flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="ghost" disabled={sending} onClick={() => { setChallengeId(''); setCode(''); setError(''); }}>Corrigir e-mail</Button><Button type="button" variant="ghost" disabled={sending || seconds > 0} onClick={() => void send('request')}>{seconds > 0 ? `Reenviar em ${seconds}s` : 'Reenviar código'}</Button></div>
        </form>
      </> : <>
        <DialogHeader><DialogTitle>Falar com suporte</DialogTitle><DialogDescription>Conte o que aconteceu. Use um e-mail pelo qual possamos responder.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={sending} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="support-email">E-mail</Label><Input id="support-email" name="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} type="email" autoComplete="email" required maxLength={254} placeholder="voce@exemplo.com" /></div>
            <div className="space-y-2"><Label htmlFor="support-subject">Assunto</Label><Input id="support-subject" name="subject" value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} required minLength={3} maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor="support-description">Descrição</Label><Textarea id="support-description" name="description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} required minLength={10} maxLength={5000} rows={6} placeholder="Descreva sua dúvida ou problema." /><p className="text-xs text-muted-foreground">Até 5.000 caracteres.</p></div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">Vamos enviar um código para confirmar seu e-mail.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={sending} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={sending}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{sending ? 'Enviando…' : 'Receber código'}</Button></div>
        </form></>}
    </DialogContent>
  </Dialog>;
}
