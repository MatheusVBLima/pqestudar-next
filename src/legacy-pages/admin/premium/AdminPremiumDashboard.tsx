"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, Ticket, ArrowRight, FileText, BookOpen, Globe2, LockKeyhole } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { PREMIUM_COURSES_PUBLIC_FLAG, useSiteFeatureFlag } from '@/hooks/useSiteFeatureFlag';
import { toast } from 'sonner';

const AdminPremiumDashboard = () => {
  const queryClient = useQueryClient();
  const { enabled: coursesPublic, loading } = useSiteFeatureFlag(PREMIUM_COURSES_PUBLIC_FLAG);
  const [saving, setSaving] = useState(false);

  const handleCoursesAccessChange = async (enabled: boolean) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('site_feature_flags')
      .update({ enabled, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
      .eq('key', PREMIUM_COURSES_PUBLIC_FLAG);

    if (error) {
      toast.error(`Não foi possível alterar o acesso: ${error.message}`);
    } else {
      await queryClient.invalidateQueries({ queryKey: ['site-feature-flag', PREMIUM_COURSES_PUBLIC_FLAG] });
      toast.success(enabled ? 'Cursos liberados para todos.' : 'Cursos restritos novamente ao Premium.');
    }
    setSaving(false);
  };

  const menuItems = [
    {
      title: 'Usuários & Assinaturas',
      description: 'Gerenciar assinantes',
      icon: Users,
      href: '/admin/premium/usuarios',
      count: null,
    },
    {
      title: 'Tokens de Resgate',
      description: 'Criar e gerenciar tokens',
      icon: Ticket,
      href: '/admin/premium/tokens',
      count: null,
    },
    {
      title: 'Importar Benefícios',
      description: 'Extrair benefícios de um PDF',
      icon: FileText,
      href: '/admin/premium/importar-beneficios',
      count: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Premium</h1>
          <p className="text-muted-foreground">Gerencie a área de membros premium</p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[var(--admin-radius)] border-primary/20">
        <CardHeader className="border-b border-border/60 bg-primary/[0.04]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-[var(--admin-radius)] border border-primary/20 bg-primary/10 p-2.5 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Acesso público aos Cursos
                  {coursesPublic ? <Globe2 className="h-4 w-4 text-emerald-500" /> : <LockKeyhole className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  Quando ativado, usuários comuns e visitantes veem Cursos no menu e acessam a lista e os detalhes. Ao desativar, quem não tiver Premium será enviado para a página de compra.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full border bg-background px-4 py-2">
              <span className="text-sm font-semibold">{coursesPublic ? 'Público' : 'Só Premium'}</span>
              <Switch
                checked={coursesPublic}
                onCheckedChange={handleCoursesAccessChange}
                disabled={loading || saving}
                aria-label="Alternar acesso público aos cursos"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-muted">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminPremiumDashboard;
