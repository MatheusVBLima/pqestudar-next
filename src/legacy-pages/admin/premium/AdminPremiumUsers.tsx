"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Search, ArrowLeft, Crown } from 'lucide-react';
import { format } from 'date-fns';

interface UserSubscription {
  id: string;
  user_id: string;
  status: string;
  plan_type: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

const AdminPremiumUsers = () => {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as assinaturas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, endsAt: string): BadgeProps['variant'] => {
    if (status !== 'active') return 'destructive';
    const isExpired = new Date(endsAt) < new Date();
    return isExpired ? 'destructive' : 'default';
  };

  const getStatusLabel = (status: string, endsAt: string) => {
    if (status !== 'active') {
      switch (status) {
        case 'inactive': return 'Inativo';
        case 'expired': return 'Expirado';
        case 'canceled': return 'Cancelado';
        default: return status;
      }
    }
    const isExpired = new Date(endsAt) < new Date();
    return isExpired ? 'Expirado' : 'Ativo';
  };

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'monthly': return 'Mensal';
      case 'annual': return 'Anual';
      case 'trial_30d': return 'Trial 30d';
      default: return planType;
    }
  };

  const getRemainingDays = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredSubscriptions = subscriptions.filter(sub => 
    !searchTerm || sub.user_id.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-3xl font-bold">Usuários & Assinaturas</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {subscriptions.filter(s => s.status === 'active' && new Date(s.ends_at) > new Date()).length} ativos
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ID do usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {subscriptions.length === 0 
              ? 'Nenhuma assinatura encontrada.'
              : 'Nenhum resultado para a busca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubscriptions.map(sub => {
            const remainingDays = getRemainingDays(sub.ends_at);
            const isActive = sub.status === 'active' && remainingDays > 0;

            return (
              <Card key={sub.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Crown className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono text-muted-foreground">
                        {sub.user_id}
                      </code>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{getPlanLabel(sub.plan_type)}</span>
                        <span>•</span>
                        <span>
                          {isActive 
                            ? `${remainingDays} dias restantes`
                            : `Expirou em ${format(new Date(sub.ends_at), 'dd/MM/yyyy')}`
                          }
                        </span>
                      </div>
                    </div>

                    <Badge variant={getStatusColor(sub.status, sub.ends_at)}>
                      {getStatusLabel(sub.status, sub.ends_at)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPremiumUsers;
