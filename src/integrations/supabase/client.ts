// Generated client adapted for SSR cookie auth (Wave 1 of Next.js migration).
// Uses @supabase/ssr.createBrowserClient so the session is persisted in cookies
// readable by Server Components, Server Actions and the proxy.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { PUBLIC_SUPABASE_URL } from '@/lib/runtime-env';

const SUPABASE_URL = PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3hpb213emJ5a21xdHRmb3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTc1OTIsImV4cCI6MjA3MzQ5MzU5Mn0.IzpMhFg4XJGNxPJlu8LTP_yDOGeHN4C8dESNKxq7bIc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
