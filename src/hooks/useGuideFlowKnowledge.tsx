import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-message';
import { PUBLIC_SUPABASE_URL } from '@/lib/runtime-env';

export type ExtractionStatus = 'pending' | 'success' | 'partial' | 'no_text' | 'error' | 'not_applicable';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  source_type: 'manual' | 'storage';
  source_bucket: string | null;
  source_path: string | null;
  synced_at: string | null;
  extraction_status: ExtractionStatus;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  totalFound: number;
  totalCreated: number;
  totalExisting: number;
  totalExtracted: number;
  totalErrors: number;
  details: Array<{ bucket: string; file: string; status: string; extraction_status?: string; error?: string }>;
}

export function useGuideFlowKnowledge() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );
      if (!resp.ok) throw new Error('Erro ao carregar biblioteca');
      const data = await resp.json();
      setEntries(data);
    } catch (err: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const createEntry = async (entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at' | 'source_type' | 'source_bucket' | 'source_path' | 'synced_at' | 'extraction_status'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const resp = await fetch(
      `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'create', ...entry }),
      }
    );
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.error); }
    await fetchEntries();
  };

  const updateEntry = async (id: string, updates: Partial<KnowledgeEntry>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const resp = await fetch(
      `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'update', id, ...updates }),
      }
    );
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.error); }
    await fetchEntries();
  };

  const deleteEntry = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const resp = await fetch(
      `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'delete', id }),
      }
    );
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.error); }
    await fetchEntries();
  };

  const syncStorage = async (): Promise<SyncResult | null> => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const resp = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'sync' }),
        }
      );
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.error); }
      const result: SyncResult = await resp.json();
      await fetchEntries();
      return result;
    } catch (err: unknown) {
      toast({ title: 'Erro na sincronização', description: getErrorMessage(err), variant: 'destructive' });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return { entries, isLoading, isSyncing, fetchEntries, createEntry, updateEntry, deleteEntry, syncStorage };
}
