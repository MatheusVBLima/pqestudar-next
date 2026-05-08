// Generated client adapted for SSR cookie auth (Wave 1 of Next.js migration).
// Uses @supabase/ssr.createBrowserClient so the session is persisted in cookies
// readable by Server Components, Server Actions and the proxy.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '@/lib/runtime-env';

const SUPABASE_URL = PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = PUBLIC_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
