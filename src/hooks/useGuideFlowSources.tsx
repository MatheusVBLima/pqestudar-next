import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-message';
import { PUBLIC_SUPABASE_URL } from '@/lib/runtime-env';
import type { KnowledgeEntry } from './useGuideFlowKnowledge';

// ── Persistence keys ────────────────────────────────────────────
const STRUCTURE_SELECTION_KEY = 'guideflow_structure_selection';

// ── Types ───────────────────────────────────────────────────────
export interface GuideFlowSources {
  // Data
  structureEntries: KnowledgeEntry[];
  libraryEntries: KnowledgeEntry[];
  isLoading: boolean;
  error: string | null;

  // Structure selections (persisted)
  selectedStructureIds: string[];
  toggleStructure: (id: string) => void;
  selectAllStructure: () => void;
  deselectAllStructure: () => void;
  applyTargetDefaults: (targetType: 'guide' | 'tool') => void;

  // Library selections
  selectedLibraryIds: string[];
  suggestedLibraryIds: string[];
  selectionMode: 'auto' | 'manual' | 'combined';
  toggleLibrary: (id: string) => void;
  setManualLibraryIds: (ids: string[]) => void;
  clearManualOverride: () => void;
  autoSuggest: (tema: string, palavraChave: string) => void;
  resolveLibraryEntries: (tema: string, palavraChave: string) => KnowledgeEntry[];

  // Derived
  activeStructureEntries: KnowledgeEntry[];
  activeLibraryEntries: KnowledgeEntry[];
  isReady: boolean;

  // Actions
  refresh: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function isSuccessfulLibraryEntry(entry: KnowledgeEntry): boolean {
  return entry.extraction_status === 'success' || entry.extraction_status === 'partial';
}

function isReferenceContextEntry(entry: KnowledgeEntry): boolean {
  const category = normalize(entry.category);
  const title = normalize(entry.title);

  return (
    category === 'referencia' ||
    category === 'reference' ||
    title.startsWith('contexto ') ||
    title.includes(' contexto ')
  );
}

function scoreRelevance(entry: KnowledgeEntry, terms: string[]): number {
  const titleNorm = normalize(entry.title);
  const contentNorm = normalize(entry.content.slice(0, 2000));
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    const t = normalize(term);
    if (titleNorm.includes(t)) score += 3;
    if (contentNorm.includes(t)) score += 1;
  }
  return score;
}

function loadPersistedStructureIds(): string[] | null {
  try {
    const raw = localStorage.getItem(STRUCTURE_SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistStructureIds(ids: string[]) {
  try {
    localStorage.setItem(STRUCTURE_SELECTION_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// ── Hook ────────────────────────────────────────────────────────
export function useGuideFlowSources(): GuideFlowSources {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Structure selection (persisted in localStorage)
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);
  const [structureInitialized, setStructureInitialized] = useState(false);

  // Library selection
  const [manualLibraryIds, setManualLibraryIdsState] = useState<string[] | null>(null);
  const [suggestedLibraryIds, setSuggestedLibraryIds] = useState<string[]>([]);

  // ── Fetch entries from Biblioteca ──
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada'); return; }

      const resp = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-knowledge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'list' }),
        }
      );
      if (!resp.ok) throw new Error('Erro ao carregar Biblioteca de Conhecimento');
      const data: KnowledgeEntry[] = await resp.json();
      setEntries(data);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Derived lists ──
  const structureEntries = useMemo(
    () => entries.filter(e =>
      e.source_bucket === 'guide-structure' &&
      e.is_active &&
      (e.extraction_status === 'success' || e.extraction_status === 'partial' || e.extraction_status === 'not_applicable')
    ),
    [entries]
  );

  const libraryEntries = useMemo(
    () => entries.filter((entry) => {
      if (!entry.is_active) return false;
      if (entry.source_bucket !== 'guide-library') return false;
      if (isSuccessfulLibraryEntry(entry)) return true;

      // Manual "Referência" entries are factual context too. They are saved
      // with extraction_status="not_applicable" because there is no file
      // extraction step, but they still must appear in the flow sources.
      return entry.extraction_status === 'not_applicable' && isReferenceContextEntry(entry);
    }),
    [entries]
  );

  // ── Initialize structure selection from localStorage or defaults ──
  useEffect(() => {
    if (structureInitialized || structureEntries.length === 0) return;
    const persisted = loadPersistedStructureIds();
    if (persisted) {
      // Keep only ids that still exist
      const valid = persisted.filter(id => structureEntries.some(e => e.id === id));
      setSelectedStructureIds(valid.length > 0 ? valid : structureEntries.map(e => e.id));
    } else {
      // Default: select all
      setSelectedStructureIds(structureEntries.map(e => e.id));
    }
    setStructureInitialized(true);
  }, [structureEntries, structureInitialized]);

  // ── Persist structure selection changes ──
  useEffect(() => {
    if (structureInitialized) {
      persistStructureIds(selectedStructureIds);
    }
  }, [selectedStructureIds, structureInitialized]);

  // ── Structure actions ──
  const toggleStructure = useCallback((id: string) => {
    setSelectedStructureIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const selectAllStructure = useCallback(() => {
    setSelectedStructureIds(structureEntries.map(e => e.id));
  }, [structureEntries]);

  const deselectAllStructure = useCallback(() => {
    setSelectedStructureIds([]);
  }, []);

  const applyTargetDefaults = useCallback((targetType: 'guide' | 'tool') => {
    if (structureEntries.length === 0) return;
    if (targetType === 'guide') {
      setSelectedStructureIds(structureEntries.map(e => e.id));
      return;
    }

    const shouldUseForTool = (entry: KnowledgeEntry) => {
      const text = normalize(`${entry.title} ${entry.source_path ?? ''}`);
      if (text.includes('sistema de links internos')) return false;
      if (text.includes('funcao de cada tipo de guia')) return false;
      if (text.includes('função de cada tipo de guia')) return false;
      if (text.includes('imagens para guias')) return false;
      if (text.includes('imagem') && text.includes('guia') && !text.includes('ferramenta')) return false;

      return (
        text.includes('estilo de titulos') ||
        text.includes('estilo de títulos') ||
        text.includes('ritmo de leitura') ||
        text.includes('linguagem padrao') ||
        text.includes('linguagem padrão') ||
        text.includes('estrutura textual') ||
        text.includes('ferramenta')
      );
    };

    const toolStructureIds = structureEntries.filter(shouldUseForTool).map(e => e.id);
    setSelectedStructureIds(toolStructureIds.length > 0 ? toolStructureIds : structureEntries.map(e => e.id));
  }, [structureEntries]);

  // ── Library auto-suggestion ──
  const autoSuggest = useCallback((tema: string, palavraChave: string) => {
    if (libraryEntries.length === 0) {
      setSuggestedLibraryIds([]);
      return;
    }

    const terms = [tema, palavraChave].filter(Boolean);
    if (terms.length === 0) {
      setSuggestedLibraryIds([]);
      return;
    }

    // Also split tema into individual words for broader matching
    const allTerms = [...terms, ...tema.split(/\s+/).filter(w => w.length > 3)];

    const scored = libraryEntries.map(entry => ({
      id: entry.id,
      score: scoreRelevance(entry, allTerms) + (isReferenceContextEntry(entry) ? 1 : 0),
    })).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    // Suggest top matches (up to 3)
    setSuggestedLibraryIds(scored.slice(0, 3).map(s => s.id));
  }, [libraryEntries]);

  const resolveLibraryEntries = useCallback((tema: string, palavraChave: string) => {
    if (manualLibraryIds !== null) {
      return libraryEntries.filter(e => manualLibraryIds.includes(e.id));
    }

    const terms = [tema, palavraChave].filter(Boolean);
    if (terms.length === 0) return [];

    const allTerms = [...terms, ...tema.split(/\s+/).filter(w => w.length > 3)];
    const scored = libraryEntries.map(entry => ({
      entry,
      score: scoreRelevance(entry, allTerms) + (isReferenceContextEntry(entry) ? 1 : 0),
    })).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map(item => item.entry);
  }, [libraryEntries, manualLibraryIds]);

  // ── Library actions ──
  const toggleLibrary = useCallback((id: string) => {
    setManualLibraryIdsState(prev => {
      const current = prev ?? suggestedLibraryIds;
      return current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    });
  }, [suggestedLibraryIds]);

  const setManualLibraryIds = useCallback((ids: string[]) => {
    setManualLibraryIdsState(ids);
  }, []);

  const clearManualOverride = useCallback(() => {
    setManualLibraryIdsState(null);
  }, []);

  // ── Effective library selection ──
  const effectiveLibraryIds = manualLibraryIds ?? suggestedLibraryIds;
  const selectionMode: 'auto' | 'manual' | 'combined' =
    manualLibraryIds === null
      ? 'auto'
      : suggestedLibraryIds.length > 0 && manualLibraryIds.some(id => !suggestedLibraryIds.includes(id))
        ? 'combined'
        : 'manual';

  // ── Active entries (selected ones) ──
  const activeStructureEntries = useMemo(
    () => structureEntries.filter(e => selectedStructureIds.includes(e.id)),
    [structureEntries, selectedStructureIds]
  );

  const activeLibraryEntries = useMemo(
    () => libraryEntries.filter(e => effectiveLibraryIds.includes(e.id)),
    [libraryEntries, effectiveLibraryIds]
  );

  const isReady = activeStructureEntries.length > 0;

  return {
    structureEntries,
    libraryEntries,
    isLoading,
    error,
    selectedStructureIds,
    toggleStructure,
    selectAllStructure,
    deselectAllStructure,
    applyTargetDefaults,
    selectedLibraryIds: effectiveLibraryIds,
    suggestedLibraryIds,
    selectionMode,
    toggleLibrary,
    setManualLibraryIds,
    clearManualOverride,
    autoSuggest,
    resolveLibraryEntries,
    activeStructureEntries,
    activeLibraryEntries,
    isReady,
    refresh: fetchEntries,
  };
}
