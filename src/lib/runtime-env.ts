export const IS_DEV = process.env.NODE_ENV !== "production";

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

if (!publicSupabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!publicSupabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

if (!metaPixelId) {
  throw new Error("Missing NEXT_PUBLIC_META_PIXEL_ID environment variable");
}

export const PUBLIC_SUPABASE_URL = publicSupabaseUrl;
export const PUBLIC_SUPABASE_ANON_KEY = publicSupabaseAnonKey;
export const META_PIXEL_ID = metaPixelId;

export const PIXEL_DISABLED =
  process.env.NEXT_PUBLIC_DISABLE_META_PIXEL === "true" ||
  (IS_DEV && process.env.NEXT_PUBLIC_ENABLE_META_PIXEL !== "true");

export const PIXEL_DEBUG = IS_DEV;
