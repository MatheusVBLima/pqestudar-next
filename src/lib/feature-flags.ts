// Feature flags. Hardcoded constants until we wire a remote-config solution.
//
// PREMIUM_SAVE_ENABLED: true once the Supabase migration that adds
// 'premium_item' to the saved_items.item_type check constraint is applied.
// Until then, INSERTs into saved_items with type 'premium_item' fail.
export const PREMIUM_SAVE_ENABLED = false;
