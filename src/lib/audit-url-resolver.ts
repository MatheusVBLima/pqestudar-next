/**
 * URL Resolver for Copy/SEO Audit optimization.
 * Maps audited paths to entity types and IDs for editing.
 */

export interface ResolvedUrl {
  entityType: 'page_settings' | 'oportunidade';
  entityId: string; // route for page_settings, slug for oportunidade
  profileKey: string;
  canonicalPath: string;
}

const PAGE_SETTINGS_ROUTES = [
  '/',
  '/ferramentas',
  '/concursos',
  '/votacoes',
  '/produtos',
  '/privacidade',
  '/termos',
  '/salvos',
  '/premium',
  '/sobre-pqestudar',
];

/**
 * Resolve a path (from audit findings) to an editable entity.
 * Returns null if the path is not yet supported for editing.
 */
export function resolveAuditedUrl(path: string): ResolvedUrl | null {
  // Normalize: remove trailing slash, query params
  const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';

  // Check page_settings routes
  if (PAGE_SETTINGS_ROUTES.includes(cleanPath)) {
    return {
      entityType: 'page_settings',
      entityId: cleanPath,
      profileKey: 'page_settings',
      canonicalPath: cleanPath,
    };
  }

  // Check concursos detail: /concursos/:slug
  const concursoMatch = cleanPath.match(/^\/concursos\/([a-z0-9-]+)$/);
  if (concursoMatch) {
    return {
      entityType: 'oportunidade',
      entityId: concursoMatch[1], // slug
      profileKey: 'oportunidade',
      canonicalPath: cleanPath,
    };
  }

  return null;
}

export function isUrlSupported(path: string): boolean {
  return resolveAuditedUrl(path) !== null;
}
