export const IS_DEV = process.env.NODE_ENV !== "production";

export const PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://omkxiomwzbykmqttfozi.supabase.co";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "4463744813854271";

export const PIXEL_DISABLED =
  process.env.NEXT_PUBLIC_DISABLE_META_PIXEL === "true" ||
  (IS_DEV && process.env.NEXT_PUBLIC_ENABLE_META_PIXEL !== "true");

export const PIXEL_DEBUG = IS_DEV;
