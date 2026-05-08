"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, BookOpen, Briefcase, Calendar, LayoutGrid, Users, Ticket, ArrowRight } from 'lucide-react';

const AdminPremiumDashboard = () => {
  const menuItems = [
    {
      title: 'Itens Premium',
      description: 'Gerenciar cursos e vagas',
      icon: BookOpen,
      href: '/admin/premium/itens',
      count: null,
    },
    {
      title: 'Atualizações Semanais',
      description: 'Gerenciar atualizações',
      icon: Calendar,
      href: '/admin/premium/atualizacoes',
      count: null,
    },
    {
      title: 'Páginas de Curadoria',
      description: 'Gerenciar curadorias',
      icon: LayoutGrid,
      href: '/admin/premium/paginas',
      count: null,
    },
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
