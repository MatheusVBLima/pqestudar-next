import { devLog } from '@/lib/dev-log';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/error-message';

export interface StorageFile {
  name: string;
  id?: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StorageSources {
  structureFiles: StorageFile[];
  libraryFolders: string[];
  libraryFiles: StorageFile[];
  isLoadingStructure: boolean;
  isLoadingLibrary: boolean;
  structureError: string | null;
  libraryError: string | null;
  selectedLibrary: string | null;
  setSelectedLibrary: (folder: string | null) => void;
  refreshAll: () => void;
  structureStatus: 'idle' | 'loading' | 'success' | 'error';
  libraryStatus: 'idle' | 'loading' | 'success' | 'error';
}

export function useGuideStorageSources(): StorageSources {
  const [structureFiles, setStructureFiles] = useState<StorageFile[]>([]);
  const [libraryFolders, setLibraryFolders] = useState<string[]>([]);
  const [libraryFiles, setLibraryFiles] = useState<StorageFile[]>([]);
  const [isLoadingStructure, setIsLoadingStructure] = useState(true);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [structureStatus, setStructureStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [libraryStatus, setLibraryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const loadStructure = useCallback(async () => {
    setIsLoadingStructure(true);
    setStructureError(null);
    setStructureStatus('loading');
    try {
      const { data, error } = await supabase.storage.from('guide-structure').list('', {
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      // Accept ALL items except the placeholder — don't filter by metadata.size or id
      const files = (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder');
      
      devLog('[guide-structure] Raw items from Storage:', data?.length, 'Filtered:', files.length, files.map(f => f.name));

      setStructureFiles(files.map(f => ({
        name: f.name,
        id: f.id ?? undefined,
        size: f.metadata?.size ?? undefined,
        created_at: f.created_at ?? undefined,
        updated_at: f.updated_at ?? undefined,
      })));
      setStructureStatus('success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error('[guide-structure] Error:', message);
      setStructureError(message);
      setStructureFiles([]);
      setStructureStatus('error');
    } finally {
      setIsLoadingStructure(false);
    }
  }, []);

  const loadLibraryFolders = useCallback(async () => {
    setIsLoadingLibrary(true);
    setLibraryError(null);
    setLibraryStatus('loading');
    try {
      const { data, error } = await supabase.storage.from('guide-library').list('', {
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const items = (data ?? []).filter(i => i.name !== '.emptyFolderPlaceholder');

      devLog('[guide-library] Raw items from Storage:', data?.length, 'Filtered:', items.length, items.map(i => ({ name: i.name, id: i.id, metaSize: i.metadata?.size })));

      const folders: string[] = [];
      const rootFiles: StorageFile[] = [];

      for (const item of items) {
        // In Supabase Storage, folders have no id (null) and no metadata
        // Files (PDFs etc.) have an id. Treat root-level files as "libraries"
        if (!item.id && !item.metadata?.size) {
          // It's a folder
          folders.push(item.name);
        } else {
          // It's a file — treat as a library entry
          rootFiles.push({
            name: item.name,
            id: item.id ?? undefined,
            size: item.metadata?.size ?? undefined,
            created_at: item.created_at ?? undefined,
            updated_at: item.updated_at ?? undefined,
          });
        }
      }

      setLibraryFolders(folders);

      // Root-level files are treated as libraries themselves
      // Show them when no folder is selected
      if (!selectedLibrary) {
        setLibraryFiles(rootFiles);
      }

      setLibraryStatus('success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error('[guide-library] Error:', message);
      setLibraryError(message);
      setLibraryFolders([]);
      setLibraryFiles([]);
      setLibraryStatus('error');
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [selectedLibrary]);

  // Load files inside selected library folder
  useEffect(() => {
    if (!selectedLibrary) return;
    const loadFolderFiles = async () => {
      setIsLoadingLibrary(true);
      try {
        const { data, error } = await supabase.storage.from('guide-library').list(selectedLibrary, {
          sortBy: { column: 'name', order: 'asc' },
        });
        if (error) throw error;
        const files = (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder');
        setLibraryFiles(files.map(f => ({
          name: f.name,
          id: f.id ?? undefined,
          size: f.metadata?.size ?? undefined,
          created_at: f.created_at ?? undefined,
          updated_at: f.updated_at ?? undefined,
        })));
      } catch (err: unknown) {
        setLibraryError(getErrorMessage(err));
        setLibraryFiles([]);
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    loadFolderFiles();
  }, [selectedLibrary]);

  useEffect(() => {
    loadStructure();
    loadLibraryFolders();
  }, [loadStructure, loadLibraryFolders]);

  const refreshAll = useCallback(() => {
    loadStructure();
    loadLibraryFolders();
  }, [loadStructure, loadLibraryFolders]);

  return {
    structureFiles,
    libraryFolders,
    libraryFiles,
    isLoadingStructure,
    isLoadingLibrary,
    structureError,
    libraryError,
    selectedLibrary,
    setSelectedLibrary,
    refreshAll,
    structureStatus,
    libraryStatus,
  };
}
