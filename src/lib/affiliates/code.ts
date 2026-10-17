// Shared by the editor, referral capture and API. Legacy 32-character codes remain valid.
export const AFFILIATE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
export function normalizeAffiliateCode(value: string) { return value.trim().toLowerCase(); }
