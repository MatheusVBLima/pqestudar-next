/**
 * Explicit mapping between guide generation functions and
 * their corresponding files in the `guide-structure` bucket.
 *
 * Each key is a generation dimension; the value is the
 * canonical file name (without extension) that MUST be present.
 */

export interface StructureMapping {
  key: string;
  label: string;
  /** Substring to match against file names (case-insensitive) */
  filePattern: string;
  /** Resolved file name from the bucket (null = not found) */
  resolvedFile: string | null;
}

export const STRUCTURE_DIMENSIONS: Omit<StructureMapping, 'resolvedFile'>[] = [
  { key: 'titulos', label: 'Títulos', filePattern: 'Estilo de Titulos' },
  { key: 'estrutura', label: 'Estrutura Textual', filePattern: 'Estrutura Textual' },
  { key: 'imagens', label: 'Imagens', filePattern: 'Diretriz Editorial de Imagens' },
  { key: 'tipo_guia', label: 'Tipo de Guia', filePattern: 'Funcao de Cada tipo de Guia' },
  { key: 'linguagem', label: 'Linguagem', filePattern: 'Linguagem Padrao' },
  { key: 'ritmo', label: 'Ritmo de Leitura', filePattern: 'Ritmo de Leitura' },
  { key: 'links', label: 'Links Internos', filePattern: 'Sistema de Links Internos' },
];

/** Normalize for matching: lowercase, remove accents/special chars */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Resolve each dimension to the actual file name found in the bucket.
 */
export function resolveStructureMapping(fileNames: string[]): StructureMapping[] {
  return STRUCTURE_DIMENSIONS.map(dim => {
    const pattern = normalize(dim.filePattern);
    const match = fileNames.find(f => normalize(f).includes(pattern));
    return { ...dim, resolvedFile: match ?? null };
  });
}

/**
 * Check which dimensions are missing their source file.
 */
export function getMissingDimensions(mapping: StructureMapping[]): StructureMapping[] {
  return mapping.filter(m => !m.resolvedFile);
}

/**
 * Check which dimensions have their source file resolved.
 */
export function getResolvedDimensions(mapping: StructureMapping[]): StructureMapping[] {
  return mapping.filter(m => !!m.resolvedFile);
}
