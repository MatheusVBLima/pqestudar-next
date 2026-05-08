import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FieldData {
  [key: string]: string;
}

interface LoadResult {
  supported: boolean;
  entityType?: string;
  entityId?: string;
  profileKey?: string;
  fields?: Record<string, string>;
  updatedAt?: string;
  error?: string;
}

interface MutationResult {
  error?: string;
  success?: boolean;
  version_id?: string;
  summary?: string;
}

export interface ContentVersion {
  id: string;
  url: string;
  entity_type: string;
  entity_id: string;
  profile_key: string;
  field_data: Record<string, string>;
  created_at: string;
  created_by: string | null;
  source: string;
  summary: string | null;
  previous_version_id: string | null;
  audit_score_before: number | null;
  audit_score_after: number | null;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Não autenticado');
  return { Authorization: `Bearer ${session.access_token}` };
}

export function useLoadEntityFields(path: string | null) {
  return useQuery<LoadResult>({
    queryKey: ['content-version-load', path],
    enabled: !!path,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const resp = await supabase.functions.invoke('admin-content-versions', {
        method: 'GET',
        headers,
        body: undefined,
      });
      // workaround: use fetch directly since invoke doesn't support GET with query params well
      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = `https://omkxiomwzbykmqttfozi.supabase.co/functions/v1/admin-content-versions`;
      const url = `${baseUrl}?action=load&path=${encodeURIComponent(path!)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar campos');
      return data as LoadResult;
    },
    staleTime: 30 * 1000,
  });
}

export function useVersionHistory(path: string | null) {
  return useQuery<ContentVersion[]>({
    queryKey: ['content-version-history', path],
    enabled: !!path,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Não autenticado');
      const baseUrl = `https://omkxiomwzbykmqttfozi.supabase.co/functions/v1/admin-content-versions`;
      const url = `${baseUrl}?action=history&path=${encodeURIComponent(path!)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar histórico');
      return data.versions ?? [];
    },
    staleTime: 30 * 1000,
  });
}

export function useSaveVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      path: string;
      entityType: string;
      entityId: string;
      profileKey: string;
      fieldData: FieldData;
      source?: string;
      auditScoreBefore?: number;
      dbId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Não autenticado');

      const resp = await supabase.functions.invoke('admin-content-versions', {
        body: {
          action: 'save',
          path: params.path,
          entity_type: params.entityType,
          entity_id: params.entityId,
          profile_key: params.profileKey,
          field_data: params.fieldData,
          source: params.source || 'copy_audit',
          audit_score_before: params.auditScoreBefore,
          db_id: params.dbId,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (resp.error) throw new Error(resp.error.message || 'Erro ao salvar versão');
      const data = resp.data as MutationResult | null;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['content-version-load', params.path] });
      qc.invalidateQueries({ queryKey: ['content-version-history', params.path] });
      qc.invalidateQueries({ queryKey: ['page_settings'] });
      qc.invalidateQueries({ queryKey: ['oportunidades-admin'] });
      qc.invalidateQueries({ queryKey: ['oportunidades-public'] });
    },
  });
}

export function useRollbackVersion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { versionId: string; path: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Não autenticado');

      const resp = await supabase.functions.invoke('admin-content-versions', {
        body: {
          action: 'rollback',
          version_id: params.versionId,
          path: params.path,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (resp.error) throw new Error(resp.error.message || 'Erro ao reverter versão');
      const data = resp.data as MutationResult | null;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['content-version-load', params.path] });
      qc.invalidateQueries({ queryKey: ['content-version-history', params.path] });
      qc.invalidateQueries({ queryKey: ['page_settings'] });
      qc.invalidateQueries({ queryKey: ['oportunidades-admin'] });
      qc.invalidateQueries({ queryKey: ['oportunidades-public'] });
      toast.success('Versão restaurada com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao reverter versão');
    },
  });
}

export function useUpdateVersionScore() {
  return useMutation({
    mutationFn: async (params: { versionId: string; scoreAfter: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Não autenticado');

      const resp = await supabase.functions.invoke('admin-content-versions', {
        body: {
          action: 'update_score',
          version_id: params.versionId,
          score_after: params.scoreAfter,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (resp.error) throw new Error(resp.error.message || 'Erro ao atualizar score');
      return resp.data;
    },
  });
}
