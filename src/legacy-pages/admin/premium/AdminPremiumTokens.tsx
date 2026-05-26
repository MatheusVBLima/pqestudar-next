"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, Ticket, ArrowLeft, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface RedeemToken {
  id: string;
  token: string;
  plan_type: string;
  plan_tier?: string | null;
  status: string;
  buyer_email: string | null;
  cakto_order_id?: string | null;
  cakto_ref_id?: string | null;
  cakto_subscription_id?: string | null;
  email_sent_at?: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const AdminPremiumTokens = () => {
  const [tokens, setTokens] = useState<RedeemToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('redeem_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tokens.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) token += '-';
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token.toUpperCase();
  };

  const handleCreateToken = async (
    planType: 'monthly' | 'annual' | 'trial_30d' | 'lifetime',
    planTier: 'basic' | 'premium' | 'founder' = 'premium',
  ) => {
    setCreating(true);
    
    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      const { error } = await supabase
        .from('redeem_tokens')
        .insert({
          token,
          plan_type: planType,
          plan_tier: planTier,
          status: 'new',
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      await fetchTokens();
      
      await navigator.clipboard.writeText(token);
      
      toast({
        title: 'Token criado!',
        description: `Token copiado para a área de transferência: ${token}`,
      });
    } catch (err) {
      console.error('Error creating token:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o token.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    toast({
      title: 'Copiado!',
      description: 'Token copiado para a área de transferência.',
    });
  };

  const handleRevokeToken = async (tokenData: RedeemToken) => {
    if (!confirm('Tem certeza que deseja revogar este token?')) return;

    try {
      const { error } = await supabase
        .from('redeem_tokens')
        .update({ status: 'revoked' })
        .eq('id', tokenData.id);

      if (error) throw error;

      setTokens(prev => prev.map(t => 
        t.id === tokenData.id ? { ...t, status: 'revoked' } : t
      ));

      toast({
        title: 'Revogado',
        description: 'Token revogado com sucesso.',
      });
    } catch (err) {
      console.error('Error revoking token:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível revogar o token.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'new': return 'default';
      case 'used': return 'secondary';
      case 'expired':
      case 'revoked': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Disponível';
      case 'used': return 'Utilizado';
      case 'expired': return 'Expirado';
      case 'revoked': return 'Revogado';
      default: return status;
    }
  };

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'monthly': return 'Mensal';
      case 'annual': return 'Anual';
      case 'trial_30d': return 'Trial 30d';
      case 'lifetime': return 'Vitalício';
      default: return planType;
    }
  };

  const getTierLabel = (planTier?: string | null) => {
    if (planTier === 'founder') return 'Fundador';
    return planTier === 'basic' ? 'Básico' : 'Premium';
  };

  const filteredTokens = tokens.filter(token => 
    !searchTerm || 
    token.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link 
        href="/admin/premium" 
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tokens de Resgate</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleCreateToken('monthly', 'basic')} disabled={creating}>
            + Básico Mensal
          </Button>
          <Button variant="outline" onClick={() => handleCreateToken('annual', 'basic')} disabled={creating}>
            + Básico Anual
          </Button>
          <Button variant="outline" onClick={() => handleCreateToken('lifetime', 'founder')} disabled={creating}>
            + Fundador
          </Button>
          <Button variant="outline" onClick={() => handleCreateToken('monthly', 'premium')} disabled={creating}>
            + Premium Mensal
          </Button>
          <Button onClick={() => handleCreateToken('annual', 'premium')} disabled={creating}>
            + Premium Anual
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar token ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tokens List */}
      {filteredTokens.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum token encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTokens.map(token => (
            <Card key={token.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <Ticket className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {token.token}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleCopyToken(token.token)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{getTierLabel(token.plan_tier)} {getPlanLabel(token.plan_type)}</span>
                      <span>•</span>
                      <span>Expira: {format(new Date(token.expires_at), 'dd/MM/yyyy HH:mm')}</span>
                      {token.buyer_email && (
                        <>
                          <span>•</span>
                          <span>{token.buyer_email}</span>
                        </>
                      )}
                      {token.cakto_order_id && <span>Cakto: {token.cakto_ref_id || token.cakto_order_id}</span>}
                      {token.email_sent_at && <span>Email enviado</span>}
                      {token.revoked_reason && <span>Revogado por {token.revoked_reason}</span>}
                    </div>
                  </div>

                  <Badge variant={getStatusColor(token.status)}>
                    {getStatusLabel(token.status)}
                  </Badge>

                  {token.status === 'new' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevokeToken(token)}
                    >
                      Revogar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPremiumTokens;
