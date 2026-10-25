type DatabaseError = { code?: string; message?: string } | null;

export function isMissingGuideAuthorColumn(error: DatabaseError) {
  return !!error && ['42703', 'PGRST204'].includes(error.code || '') && /author_id/.test(error.message || '');
}

export function isMissingAuthorProfiles(error: DatabaseError) {
  return !!error && ['42P01', 'PGRST205'].includes(error.code || '') && /author_profiles/.test(error.message || '');
}
