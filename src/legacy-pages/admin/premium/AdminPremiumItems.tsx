"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, BookOpen, Briefcase, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PremiumItem {
  id: string;
  item_type: string;
  title: string;
  slug: string;
  status: string;
  tags: string[];
  published_at: string | null;
  created_at: string;
}

const AdminPremiumItems = () => {
  const [items, setItems] = useState<PremiumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('premium_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os itens.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: PremiumItem) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    
    try {
      const { error } = await supabase
        .from('premium_items')
        .update({ 
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null
        })
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : null }
          : i
      ));

      toast({
        title: 'Sucesso',
        description: newStatus === 'published' ? 'Item publicado.' : 'Item despublicado.',
      });
    } catch (err) {
      console.error('Error toggling status:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (item: PremiumItem) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('premium_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== item.id));

      toast({
        title: 'Excluído',
        description: 'Item excluído com sucesso.',
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o item.',
        variant: 'destructive',
      });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
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
        <h1 className="text-3xl font-bold">Itens Premium</h1>
        <Button asChild>
          <Link href="/admin/premium/itens/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="course">Cursos</SelectItem>
            <SelectItem value="job">Vagas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum item encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {item.item_type === 'course' ? (
                      <BookOpen className="h-5 w-5" />
                    ) : (
                      <Briefcase className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{item.item_type === 'course' ? 'Curso' : 'Vaga'}</span>
                      <span>•</span>
                      <span>/{item.slug}</span>
                    </div>
                  </div>

                  <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                    {item.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </Badge>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleStatus(item)}
                      title={item.status === 'published' ? 'Despublicar' : 'Publicar'}
                    >
                      {item.status === 'published' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" asChild>
                      <Link href={`/admin/premium/itens/${item.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPremiumItems;
