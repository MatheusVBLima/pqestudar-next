// Re-export the Supabase client from the native integration
export { supabase } from '@/integrations/supabase/client'

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return true // Always true with native integration
}